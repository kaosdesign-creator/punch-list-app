import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const punchItem = await prisma.punchItem.findUnique({
      where: { id },
      include: {
        trade: true,
        subTrade: true,
        area: true,
        photos: {
          orderBy: { order: 'asc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        },
        project: {
          include: {
            admins: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    })

    if (!punchItem) {
      return NextResponse.json({ error: 'Punch item not found' }, { status: 404 })
    }

    if (punchItem.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(punchItem)
  } catch (error) {
    console.error('Error fetching punch item:', error)
    return NextResponse.json({ error: 'Failed to fetch punch item' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tradeId, subTradeId, areaId, description, status, note } = body

    const existingItem = await prisma.punchItem.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Punch item not found' }, { status: 404 })
    }

    if (existingItem.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: any = {}
    if (tradeId !== undefined) updateData.tradeId = tradeId || null
    if (subTradeId !== undefined) updateData.subTradeId = subTradeId || null
    if (areaId !== undefined) updateData.areaId = areaId || null
    if (description !== undefined) updateData.description = description

    if (status && status !== existingItem.status) {
      updateData.status = status
      await prisma.punchItemStatusHistory.create({
        data: {
          punchItemId: id,
          status,
          note: note || null,
          userId: session.user.id,
        },
      })
    }

    const punchItem = await prisma.punchItem.update({
      where: { id },
      data: updateData,
      include: {
        trade: true,
        subTrade: true,
        area: true,
        photos: {
          orderBy: { order: 'asc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        },
      },
    })

    return NextResponse.json(punchItem)
  } catch (error) {
    console.error('Error updating punch item:', error)
    return NextResponse.json({ error: 'Failed to update punch item' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingItem = await prisma.punchItem.findUnique({
      where: { id },
      include: { project: true },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Punch item not found' }, { status: 404 })
    }

    if (existingItem.project.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.punchItem.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting punch item:', error)
    return NextResponse.json({ error: 'Failed to delete punch item' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const tradeId = searchParams.get('tradeId')
    const areaId = searchParams.get('areaId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const where: any = {
      projectId,
      project: {
        userId: session.user.id,
      },
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (tradeId && tradeId !== 'all') {
      where.tradeId = tradeId
    }

    if (areaId && areaId !== 'all') {
      where.areaId = areaId
    }

    const punchItems = await prisma.punchItem.findMany({
      where,
      include: {
        trade: true,
        subTrade: true,
        area: true,
        photos: {
          orderBy: { order: 'asc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { user: true },
        },
      },
      orderBy: { itemNumber: 'desc' },
    })

    return NextResponse.json(punchItems)
  } catch (error) {
    console.error('Error fetching punch items:', error)
    return NextResponse.json({ error: 'Failed to fetch punch items' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, tradeId, subTradeId, areaId, description, status, photos } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const maxItemNumber = await prisma.punchItem.findFirst({
      where: { projectId },
      orderBy: { itemNumber: 'desc' },
      select: { itemNumber: true },
    })

    const nextItemNumber = (maxItemNumber?.itemNumber || 0) + 1

    const punchItem = await prisma.punchItem.create({
      data: {
        projectId,
        userId: session.user.id,
        tradeId: tradeId || null,
        subTradeId: subTradeId || null,
        areaId: areaId || null,
        description: description || null,
        status: status || 'DRAFT',
        itemNumber: nextItemNumber,
        photos: photos ? {
          create: photos.map((photo: any, index: number) => ({
            filename: photo.filename,
            originalName: photo.originalName,
            order: index + 1,
          })),
        } : undefined,
      },
      include: {
        trade: true,
        subTrade: true,
        area: true,
        photos: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(punchItem)
  } catch (error) {
    console.error('Error creating punch item:', error)
    return NextResponse.json({ error: 'Failed to create punch item' }, { status: 500 })
  }
}

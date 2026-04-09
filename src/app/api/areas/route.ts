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

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    const areas = await prisma.area.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(areas)
  } catch (error) {
    console.error('Error fetching areas:', error)
    return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, name, isCustom } = body

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name are required' }, { status: 400 })
    }

    const area = await prisma.area.create({
      data: {
        projectId,
        name,
        isCustom: isCustom || false,
      },
    })

    return NextResponse.json(area)
  } catch (error) {
    console.error('Error creating area:', error)
    return NextResponse.json({ error: 'Failed to create area' }, { status: 500 })
  }
}

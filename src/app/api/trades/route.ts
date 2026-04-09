import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trades = await prisma.trade.findMany({
      where: { userId: session.user.id },
      include: {
        subTrades: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, subTrades } = body

    if (!name) {
      return NextResponse.json({ error: 'Trade name is required' }, { status: 400 })
    }

    const trade = await prisma.trade.create({
      data: {
        userId: session.user.id,
        name,
        subTrades: subTrades?.length ? {
          create: subTrades.map((subTrade: string) => ({
            userId: session.user.id,
            name: subTrade,
          })),
        } : undefined,
      },
      include: {
        subTrades: true,
      },
    })

    return NextResponse.json(trade)
  } catch (error) {
    console.error('Error creating trade:', error)
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Disable prepared statements
const prismaOptions = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL + "&statement_cache_size=0",
    },
  },
}

export async function POST() {
  // Create fresh client per request
  const prisma = new PrismaClient(prismaOptions)
  
  try {
    const url = new URL(process.env.DATABASE_URL || '')
    const body = await new Request(url).json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    let user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12)
      user = await prisma.user.create({
        data: { 
          username, 
          email: username + '@app.com', 
          passwordHash,
        },
      })
    }

    await prisma.$disconnect()
    return NextResponse.json({ 
      id: user.id, 
      username: user.username, 
      email: user.email 
    })
  } catch (error: any) {
    console.error('Error:', error)
    try { await prisma.$disconnect() } catch {}
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
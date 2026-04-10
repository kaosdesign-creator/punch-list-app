import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const prisma = new PrismaClient()
  
  try {
    const body = await request.json()
    const { username, email, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      // Create new user (any password works!)
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
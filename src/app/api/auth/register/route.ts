import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const prisma = new PrismaClient()
  
  try {
    const body = await request.json()
    const { username, email, password, firstName, lastName } = body

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password required' }, { status: 400 })
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })

    if (existingUser) {
      // Try to verify password
      const isValid = await bcrypt.compare(password, existingUser.passwordHash)
      if (isValid) {
        await prisma.$disconnect()
        return NextResponse.json({ 
          id: existingUser.id, 
          username: existingUser.username, 
          email: existingUser.email,
          message: 'Login successful'
        })
      }
      await prisma.$disconnect()
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create new user
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { 
        username, 
        email, 
        passwordHash, 
        firstName: firstName || null, 
        lastName: lastName || null 
      },
    })

    // Create default company
    const company = await prisma.company.create({
      data: {
        userId: user.id,
        name: 'My Company',
      },
    })

    await prisma.$disconnect()
    return NextResponse.json({ 
      id: user.id, 
      username: user.username, 
      email: user.email,
      message: 'Account created!'
    })
  } catch (error: any) {
    console.error('Error:', error)
    try { await prisma.$disconnect() } catch {}
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
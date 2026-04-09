import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  let prisma: PrismaClient
  
  try {
    prisma = new PrismaClient()
    
    // Try to create tables if they don't exist - ignore errors
    try {
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "username" TEXT UNIQUE NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "firstName" TEXT,
        "lastName" TEXT,
        "phone" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`
    } catch (e) { /* ignore */ }
    
    // Create project types
    const projectTypes = ['RESTAURANT', 'OFFICE', 'RETAIL', 'HOTEL', 'WAREHOUSE', 'RESIDENTIAL']
    for (const type of projectTypes) {
      try {
        await prisma.projectType.upsert({
          where: { id: type.toLowerCase() },
          update: {},
          create: { id: type.toLowerCase(), name: type },
        })
      } catch (e) { /* ignore - might already exist */ }
    }
  } catch (e) {
    // Continue to registration
  }

  try {
    const body = await request.json()
    const { username, email, password, firstName, lastName } = body

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username or email already exists' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { username, email, passwordHash, firstName: firstName || null, lastName: lastName || null },
    })

    await prisma.$disconnect()

    return NextResponse.json({ id: user.id, username: user.username, email: user.email })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
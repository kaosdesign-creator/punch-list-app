import { NextResponse } from 'next/server'
import { PrismaClient, ProjectTypeEnum, PunchItemStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const prisma = new PrismaClient()

  try {
    // Try to create tables if they don't exist
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "username" TEXT UNIQUE NOT NULL,
          "email" TEXT UNIQUE NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "firstName" TEXT,
          "lastName" TEXT,
          "phone" TEXT,
          "createdAt" TIMESTAMP DEFAULT NOW()
        )
      `
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "ProjectType" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL
        )
      `
    } catch (e) { /* ignore if tables exist */ }

    // Create project types
    const projectTypes = ['RESTAURANT', 'OFFICE', 'RETAIL', 'HOTEL', 'WAREHOUSE', 'RESIDENTIAL']
    for (const type of projectTypes) {
      try {
        await prisma.$executeRaw`INSERT INTO "ProjectType" (id, name) VALUES (${type.toLowerCase()}, ${type}) ON CONFLICT DO NOTHING`
      } catch (e) { /* ignore */ }
    }
  } catch (e) { /* Continue even if this fails */ }

  try {
    const body = await request.json()
    const { username, email, password, firstName, lastName } = body

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 })
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: { username, email, passwordHash, firstName: firstName || null, lastName: lastName || null },
    })

    await prisma.$disconnect()

    return NextResponse.json({ id: user.id, username: user.username, email: user.email })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 })
  }
}
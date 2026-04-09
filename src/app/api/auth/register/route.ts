import { NextResponse } from 'next/server'
import { PrismaClient, ProjectTypeEnum } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  const prisma = new PrismaClient()

  try {
    // Create project types
    const projectTypes: ProjectTypeEnum[] = [
      ProjectTypeEnum.RESTAURANT,
      ProjectTypeEnum.OFFICE,
      ProjectTypeEnum.RETAIL,
      ProjectTypeEnum.HOTEL,
      ProjectTypeEnum.WAREHOUSE,
      ProjectTypeEnum.RESIDENTIAL
    ]
    
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
    // Continue even if this fails
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
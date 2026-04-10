import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  const prisma = new PrismaClient()
  
  try {
    // Get all projects
    const projects = await prisma.project.findMany({
      include: {
        projectType: true,
        company: true,
        _count: {
          select: { punchItems: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    })
    
    await prisma.$disconnect()
    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    await prisma.$disconnect()
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const prisma = new PrismaClient()
  
  try {
    const body = await request.json()
    const { name, clientName, clientAddress, projectNumber, projectTypeId, userId, companyId } = body

    if (!name || !projectTypeId) {
      return NextResponse.json(
        { error: 'Project name and type are required' },
        { status: 400 }
      )
    }

    // Get or create user
    let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : await prisma.user.findFirst()
    
    if (!user) {
      // Create a default user if none exists
      user = await prisma.user.create({
        data: {
          username: 'default',
          email: 'default@example.com',
          passwordHash: 'default',
        },
      })
    }

    // Get or create company
    let company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : await prisma.company.findFirst({ where: { userId: user.id } })
    
    if (!company) {
      company = await prisma.company.create({
        data: {
          userId: user.id,
          name: 'My Company',
        },
      })
    }

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        companyId: company.id,
        name,
        clientName: clientName || null,
        clientAddress: clientAddress || null,
        projectNumber: projectNumber || null,
        projectTypeId,
      },
      include: {
        projectType: true,
        company: true,
      },
    })

    await prisma.$disconnect()
    return NextResponse.json(project)
  } catch (error: any) {
    console.error('Error creating project:', error)
    await prisma.$disconnect()
    return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 })
  }
}
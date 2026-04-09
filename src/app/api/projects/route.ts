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

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      include: {
        projectType: true,
        company: true,
        _count: {
          select: { punchItems: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, clientName, clientAddress, projectNumber, projectTypeId, companyId } = body

    if (!name || !projectTypeId) {
      return NextResponse.json(
        { error: 'Project name and type are required' },
        { status: 400 }
      )
    }

    let company = await prisma.company.findFirst({
      where: { userId: session.user.id }
    })

    if (!company && companyId) {
      company = await prisma.company.findUnique({ where: { id: companyId } })
    }

    if (!company) {
      company = await prisma.company.create({
        data: {
          userId: session.user.id,
          name: 'My Company',
        },
      })
    }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        companyId: company.id,
        name,
        clientName: clientName || null,
        clientAddress: clientAddress || null,
        projectNumber: projectNumber || null,
        projectTypeId,
        admins: {
          create: {
            userId: session.user.id,
            isPrimaryAdmin: true,
          },
        },
      },
      include: {
        projectType: true,
        company: true,
      },
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

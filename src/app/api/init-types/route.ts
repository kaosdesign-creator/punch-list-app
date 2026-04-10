import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  const prisma = new PrismaClient()
  
  try {
    // Create project types
    const types = [
      { id: 'restaurant', name: 'RESTAURANT' },
      { id: 'office', name: 'OFFICE' },
      { id: 'retail', name: 'RETAIL' },
      { id: 'hotel', name: 'HOTEL' },
      { id: 'warehouse', name: 'WAREHOUSE' },
      { id: 'residential', name: 'RESIDENTIAL' }
    ]

    for (const type of types) {
      try {
        await prisma.$executeRaw`
          INSERT INTO "ProjectType" (id, name) VALUES (${type.id}, ${type.name}) ON CONFLICT DO NOTHING
        `
      } catch (e) {}
    }

    await prisma.$disconnect()
    return NextResponse.json({ success: true, message: 'Project types created!' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
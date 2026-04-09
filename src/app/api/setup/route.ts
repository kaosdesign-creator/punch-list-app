import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const prisma = new PrismaClient()
    
    // Create project types
    const projectTypes = ['RESTAURANT', 'OFFICE', 'RETAIL', 'HOTEL', 'WAREHOUSE', 'RESIDENTIAL']
    
    for (const type of projectTypes) {
      await prisma.projectType.upsert({
        where: { id: type.toLowerCase() },
        update: {},
        create: {
          id: type.toLowerCase(),
          name: type,
        },
      })
    }

    // Create demo user
    const existingUser = await prisma.user.findUnique({
      where: { username: 'demo' }
    })

    if (!existingUser) {
      const passwordHash = await bcrypt.hash('demo123', 12)
      
      const user = await prisma.user.create({
        data: {
          username: 'demo',
          email: 'demo@example.com',
          passwordHash,
          firstName: 'Demo',
          lastName: 'User',
        },
      })

      const defaultTrades = [
        'Concrete', 'Masonry', 'Structural Steel', 'Millwork', 'Roofing',
        'Insulation', 'Waterproofing', 'Doors, Frames and Hardware', 'Windows',
        'Drywall', 'Paint', 'Flooring', 'Toilet Accessories', 'Signage',
        'Lockers', 'Commercial Kitchen Equipment', 'Refrigeration', 'Fire Sprinklers',
        'Fire Alarm', 'Fire Suppression', 'Plumbing', 'HVAC', 'Electrical',
        'Low Voltage', 'Security', 'Earthwork', 'Landscaping',
      ]

      for (const tradeName of defaultTrades) {
        await prisma.trade.create({
          data: {
            userId: user.id,
            name: tradeName,
          },
        })
      }
    }

    await prisma.$disconnect()
    
    return NextResponse.json({ success: true, message: 'Database initialized!' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }
}
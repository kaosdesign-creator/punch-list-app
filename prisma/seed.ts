import { PrismaClient, ProjectTypeEnum } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'

const adapter = new PrismaLibSql({ url: 'file:./prisma/dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  const projectTypes = ['RESTAURANT', 'OFFICE', 'RETAIL', 'HOTEL', 'WAREHOUSE', 'RESIDENTIAL']
  
  for (const type of projectTypes) {
    await prisma.projectType.upsert({
      where: { id: type.toLowerCase() },
      update: {},
      create: {
        id: type.toLowerCase(),
        name: type as ProjectTypeEnum,
      },
    })
  }
  console.log('Project types created')

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

    console.log('Demo user created (username: demo, password: demo123)')
  }

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
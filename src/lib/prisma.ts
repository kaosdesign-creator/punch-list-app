import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const client = new PrismaClient()
  // @ts-ignore - this is a workaround for Supabase connection pooling
  client.$on('beforeExit', async () => {
    await client.$disconnect()
  })
  return client
}

export const prisma = createPrismaClient()
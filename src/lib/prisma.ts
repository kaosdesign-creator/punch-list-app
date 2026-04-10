import { PrismaClient } from '@prisma/client'

// Create new client for each request to avoid connection issues
export function createPrisma() {
  return new PrismaClient()
}

export const prisma = createPrisma()
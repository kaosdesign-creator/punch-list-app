import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  try {
    const prisma = new PrismaClient()
    
    // Try a simple query
    await prisma.$queryRaw`SELECT 1`
    
    await prisma.$disconnect()
    return NextResponse.json({ status: 'Database connected!' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
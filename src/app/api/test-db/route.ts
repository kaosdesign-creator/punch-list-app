import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function POST() {
  const prisma = new PrismaClient()
  
  try {
    const url = new URL(process.env.DATABASE_URL || '')
    const poolMode = url.searchParams.get('pool_mode')
    
    await prisma.$disconnect()
    return NextResponse.json({ poolMode, status: 'ok' })
  } catch (error: any) {
    try { await prisma.$disconnect() } catch {}
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
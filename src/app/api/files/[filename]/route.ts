import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { filename } = await params
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filepath = path.join(process.cwd(), 'uploads', filename)
    
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const file = await readFile(filepath)
    const ext = path.extname(filename).toLowerCase()
    
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    }

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000',
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}

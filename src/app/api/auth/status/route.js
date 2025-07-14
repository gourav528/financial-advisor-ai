import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      authenticated: !!session,
      user: session?.user || null,
      accessToken: session?.accessToken ? 'present' : 'missing',
      provider: session?.provider || null,
      expires: session?.expires || null
    })
  } catch (error) {
    console.error('Error checking auth status:', error)
    return NextResponse.json({
      error: error.message,
      authenticated: false
    })
  }
} 
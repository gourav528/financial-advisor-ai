import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    
    // Clear all Google-related cookies
    cookieStore.delete('google_access_token')
    cookieStore.delete('google_refresh_token')
    cookieStore.delete('google_token_expiry')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Google disconnected successfully' 
    })
  } catch (error) {
    console.error('Error disconnecting Google:', error)
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    )
  }
} 
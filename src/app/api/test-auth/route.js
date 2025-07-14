import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { getGoogleToken } from '../../../lib/tools.js'
import { authOptions } from '@/lib/auth.js'

export async function GET() {
  try {
    // Check NextAuth session
    const session = await getServerSession(authOptions)
    console.log('NextAuth session:', session ? 'exists' : 'null')
    console.log('Session user:', session?.user)
    console.log('Access token:', session?.accessToken ? 'present' : 'missing')

    // Check Google token
    const googleToken = await getGoogleToken()
    console.log('Google token:', googleToken ? 'present' : 'missing')

    // Test Gmail API access
    let gmailTest = { success: false, error: 'Not tested' }
    if (googleToken) {
      try {
        const { google } = await import('googleapis')
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        )
        
        oauth2Client.setCredentials({
          access_token: googleToken
        })

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
        const profile = await gmail.users.getProfile({ userId: 'me' })
        
        gmailTest = {
          success: true,
          email: profile.data.emailAddress,
          messagesTotal: profile.data.messagesTotal,
          threadsTotal: profile.data.threadsTotal
        }
      } catch (error) {
        gmailTest = {
          success: false,
          error: error.message
        }
      }
    }

    return NextResponse.json({
      session: {
        exists: !!session,
        user: session?.user,
        accessToken: !!session?.accessToken
      },
      googleToken: {
        exists: !!googleToken,
        token: googleToken ? 'present' : 'missing'
      },
      gmailTest,
      environment: {
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_REDIRECT_URI: !!process.env.GOOGLE_REDIRECT_URI
      }
    })

  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
} 
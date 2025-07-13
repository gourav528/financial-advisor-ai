import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/?error=google_auth_failed', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_authorization_code', request.url))
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/?error=oauth_not_configured', request.url))
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    // Store tokens securely (in production, use a database)
    const cookieStore = await cookies()
    
    cookieStore.set('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour (access tokens expire quickly)
    })

    if (tokens.refresh_token) {
      cookieStore.set('google_refresh_token', tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    // Store token expiry
    if (tokens.expiry_date) {
      cookieStore.set('google_token_expiry', tokens.expiry_date.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    return NextResponse.redirect(new URL('/?google_connected=true', request.url))

  } catch (error) {
    console.error('Google OAuth callback error:', error)
    return NextResponse.redirect(new URL('/?error=oauth_callback_failed', request.url))
  }
} 
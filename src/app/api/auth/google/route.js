import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google OAuth credentials not configured' },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // Define the scopes we need
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]

    // Generate the authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent' // This ensures we get a refresh token
    })

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Navigate to this URL to authorize Google access'
    })

  } catch (error) {
    console.error('Error generating Google OAuth URL:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate OAuth URL',
        details: error.message 
      },
      { status: 500 }
    )
  }
} 
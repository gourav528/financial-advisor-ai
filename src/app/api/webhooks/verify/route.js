import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const challenge = searchParams.get('hub.challenge')
    const mode = searchParams.get('hub.mode')
    const verifyToken = searchParams.get('hub.verify_token')

    // Handle HubSpot webhook verification
    if (mode === 'subscribe' && verifyToken === process.env.HUBSPOT_VERIFY_TOKEN) {
      console.log('HubSpot webhook verification successful')
      return new NextResponse(challenge, { status: 200 })
    }

    // Handle Google webhook verification (if needed)
    const googleChallenge = searchParams.get('challenge')
    if (googleChallenge) {
      console.log('Google webhook verification successful')
      return new NextResponse(googleChallenge, { status: 200 })
    }

    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 })

  } catch (error) {
    console.error('Webhook verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Handle different verification payloads
    if (body.type === 'url_verification') {
      // Slack-style verification
      return NextResponse.json({
        challenge: body.challenge
      })
    }

    // Default verification response
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook verification POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 
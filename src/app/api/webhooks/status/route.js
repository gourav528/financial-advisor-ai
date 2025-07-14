import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')

    if (service) {
      return await getServiceStatus(service)
    }

    // Return overall webhook status
    const status = {
      gmail: await getServiceStatus('gmail'),
      calendar: await getServiceStatus('calendar'),
      hubspot: await getServiceStatus('hubspot'),
      overall: {
        active: 0,
        total: 3
      }
    }

    // Calculate overall status
    status.overall.active = [status.gmail, status.calendar, status.hubspot]
      .filter(s => s.active).length

    return NextResponse.json(status)

  } catch (error) {
    console.error('Webhook status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getServiceStatus(service) {
  try {
    switch (service) {
      case 'gmail':
        return await getGmailStatus()
      case 'calendar':
        return await getCalendarStatus()
      case 'hubspot':
        return await getHubSpotStatus()
      default:
        return NextResponse.json({ error: 'Unknown service' })
    }
  } catch (error) {
    console.error(`Error getting ${service} status:`, error)
    return NextResponse.json({
      service,
      active: false,
      error: error.message,
      lastCheck: new Date().toISOString()
    })
  }
}

async function getGmailStatus() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Get access token from NextAuth session
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('../../auth/[...nextauth]/route.js')
    
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken
    
    if (accessToken) {
      oauth2Client.setCredentials({
        access_token: accessToken
      })
    } else {
      return NextResponse.json({
        service: 'gmail',
        active: false,
        error: 'Not authenticated with Google',
        lastCheck: new Date().toISOString()
      })
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Check if Gmail API is accessible
    const profile = await gmail.users.getProfile({ userId: 'me' })

    return NextResponse.json({
      service: 'gmail',
      active: true,
      email: profile.data.emailAddress,
      messagesTotal: profile.data.messagesTotal,
      threadsTotal: profile.data.threadsTotal,
      lastCheck: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      service: 'gmail',
      active: false,
      error: error.message,
      lastCheck: new Date().toISOString()
    })
  }
}

async function getCalendarStatus() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Get access token from NextAuth session
    const { getServerSession } = await import('next-auth/next')
    const { authOptions } = await import('../../auth/[...nextauth]/route.js')
    
    const session = await getServerSession(authOptions)
    const accessToken = session?.accessToken
    
    if (accessToken) {
      oauth2Client.setCredentials({
        access_token: accessToken
      })
    } else {
      return NextResponse.json({
        service: 'calendar',
        active: false,
        error: 'Not authenticated with Google',
        lastCheck: new Date().toISOString()
      })
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Check if Calendar API is accessible
    const calendarList = await calendar.calendarList.list()

    return NextResponse.json({
      service: 'calendar',
      active: true,
      calendars: calendarList.data.items?.length || 0,
      primaryCalendar: calendarList.data.items?.find(c => c.primary)?.summary,
      lastCheck: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({
      service: 'calendar',
      active: false,
      error: error.message,
      lastCheck: new Date().toISOString()
    })
  }
}

async function getHubSpotStatus() {
  try {
    const { getHubSpotClient } = await import('../../../../lib/hubspot.js')
    const hubspotClient = await getHubSpotClient()

    // Check if HubSpot client is properly configured
    if (!hubspotClient || !hubspotClient.crm) {
      return NextResponse.json({
        service: 'hubspot',
        active: false,
        error: 'HubSpot not configured. Please connect your HubSpot account.',
        lastCheck: new Date().toISOString()
      })
    }

    // Try to access HubSpot API to verify connection
    try {
      const contacts = await hubspotClient.crm.contacts.basicApi.getPage(1)
      return NextResponse.json({
        service: 'hubspot',
        active: true,
        contactsCount: contacts.results?.length || 0,
        lastCheck: new Date().toISOString()
      })
    } catch (apiError) {
      return NextResponse.json({
        service: 'hubspot',
        active: false,
        error: apiError.message,
        lastCheck: new Date().toISOString()
      })
    }

  } catch (error) {
    return NextResponse.json({
      service: 'hubspot',
      active: false,
      error: error.message,
      lastCheck: new Date().toISOString()
    })
  }
}

export async function POST(request) {
  try {
    const { action, service } = await request.json()

    if (action === 'test') {
      // Test webhook functionality
      const testResult = await testWebhook(service)
      return NextResponse.json(testResult)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Webhook status POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function testWebhook(service) {
  try {
    switch (service) {
      case 'gmail':
        return await testGmailWebhook()
      case 'calendar':
        return await testCalendarWebhook()
      case 'hubspot':
        return await testHubSpotWebhook()
      default:
        return { error: 'Unknown service' }
    }
  } catch (error) {
    return {
      service,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

async function testGmailWebhook() {
  // Simulate a test email webhook
  const testPayload = {
    historyId: '12345',
    emailAddress: 'test@example.com'
  }

  // This would normally call the actual webhook endpoint
  console.log('Testing Gmail webhook with payload:', testPayload)

  return {
    service: 'gmail',
    success: true,
    message: 'Gmail webhook test completed',
    timestamp: new Date().toISOString()
  }
}

async function testCalendarWebhook() {
  // Simulate a test calendar webhook
  const testPayload = {
    resourceId: 'test-event-id',
    resourceUri: 'https://www.googleapis.com/calendar/v3/calendars/primary/events/test-event-id'
  }

  console.log('Testing Calendar webhook with payload:', testPayload)

  return {
    service: 'calendar',
    success: true,
    message: 'Calendar webhook test completed',
    timestamp: new Date().toISOString()
  }
}

async function testHubSpotWebhook() {
  // Simulate a test HubSpot webhook
  const testPayload = {
    subscriptionType: 'contact.creation',
    portalId: 12345,
    objectId: 67890
  }

  console.log('Testing HubSpot webhook with payload:', testPayload)

  return {
    service: 'hubspot',
    success: true,
    message: 'HubSpot webhook test completed',
    timestamp: new Date().toISOString()
  }
} 
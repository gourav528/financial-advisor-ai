import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(request) {
  try {
    const { service, action } = await request.json()
    
    if (!service || !action) {
      return NextResponse.json({ error: 'Missing service or action' }, { status: 400 })
    }

    switch (service) {
      case 'gmail':
        return await setupGmailWebhook(action)
      case 'calendar':
        return await setupCalendarWebhook(action)
      case 'hubspot':
        return await setupHubSpotWebhook(action)
      default:
        return NextResponse.json({ error: 'Unknown service' }, { status: 400 })
    }

  } catch (error) {
    console.error('Webhook setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function setupGmailWebhook(action) {
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
      console.warn('No Google access token available in session')
      return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 })
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    if (action === 'create') {
      // Create Gmail push notification
      const response = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: 'projects/your-project-id/topics/gmail-notifications',
          labelIds: ['INBOX'],
          labelFilterAction: 'include'
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Gmail webhook created successfully',
        historyId: response.data.historyId
      })

    } else if (action === 'delete') {
      // Stop Gmail push notifications
      await gmail.users.stop({
        userId: 'me'
      })

      return NextResponse.json({
        success: true,
        message: 'Gmail webhook stopped successfully'
      })
    }

  } catch (error) {
    console.error('Gmail webhook setup error:', error)
    return NextResponse.json({
      error: 'Failed to setup Gmail webhook',
      details: error.message
    }, { status: 500 })
  }
}

async function setupCalendarWebhook(action) {
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
      console.warn('No Google access token available in session')
      return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 })
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    if (action === 'create') {
      // Create Calendar push notification
      const response = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: 'calendar-webhook-' + Date.now(),
          type: 'web_hook',
          address: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/calendar`,
          params: {
            ttl: '86400' // 24 hours
          }
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Calendar webhook created successfully',
        resourceId: response.data.resourceId,
        resourceUri: response.data.resourceUri,
        expiration: response.data.expiration
      })

    } else if (action === 'delete') {
      // Stop Calendar push notifications
      // Note: Calendar doesn't have a direct stop method, webhooks expire automatically
      return NextResponse.json({
        success: true,
        message: 'Calendar webhook will expire automatically'
      })
    }

  } catch (error) {
    console.error('Calendar webhook setup error:', error)
    return NextResponse.json({
      error: 'Failed to setup Calendar webhook',
      details: error.message
    }, { status: 500 })
  }
}

async function setupHubSpotWebhook(action) {
  try {
    // Get HubSpot client with proper OAuth tokens
    const { getHubSpotClient } = await import('../../../../lib/hubspot.js')
    const hubspotClient = await getHubSpotClient()
    
    // Check if HubSpot is properly configured
    if (!hubspotClient || !hubspotClient.crm) {
      return NextResponse.json({ error: 'HubSpot not configured. Please connect your HubSpot account.' }, { status: 401 })
    }

    if (action === 'create') {
      // Create HubSpot webhook subscriptions
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/hubspot`
      
      const subscriptions = [
        {
          eventType: 'contact.creation',
          propertyName: '*'
        },
        {
          eventType: 'contact.propertyChange',
          propertyName: '*'
        },
        {
          eventType: 'deal.creation',
          propertyName: '*'
        },
        {
          eventType: 'deal.propertyChange',
          propertyName: '*'
        },
        {
          eventType: 'note.creation',
          propertyName: '*'
        }
      ]

      const createdSubscriptions = []

      for (const subscription of subscriptions) {
        try {
          const response = await hubspotClient.apiRequest({
            method: 'POST',
            path: '/webhooks/v1/your-portal-id/subscriptions',
            body: {
              eventType: subscription.eventType,
              propertyName: subscription.propertyName,
              active: true,
              subscriptionDetails: {
                url: webhookUrl
              }
            }
          })

          createdSubscriptions.push({
            eventType: subscription.eventType,
            subscriptionId: response.body.id
          })
        } catch (error) {
          console.error(`Failed to create subscription for ${subscription.eventType}:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'HubSpot webhooks created successfully',
        subscriptions: createdSubscriptions
      })

    } else if (action === 'delete') {
      // Delete HubSpot webhook subscriptions
      // You would need to store subscription IDs to delete them
      return NextResponse.json({
        success: true,
        message: 'HubSpot webhook deletion not implemented (requires stored subscription IDs)'
      })
    }

  } catch (error) {
    console.error('HubSpot webhook setup error:', error)
    return NextResponse.json({
      error: 'Failed to setup HubSpot webhook',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook setup endpoint',
    description: 'Configure webhooks for Gmail, Calendar, and HubSpot',
    usage: {
      'POST /api/webhooks/setup': 'Setup webhooks',
      body: {
        service: 'gmail' | 'calendar' | 'hubspot',
        action: 'create' | 'delete'
      }
    }
  })
} 
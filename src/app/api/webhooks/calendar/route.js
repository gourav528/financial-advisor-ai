import { NextResponse } from 'next/server'
import { processCalendarEvent } from '../../../../lib/rag.js'
import { createTask } from '../../../../lib/database.js'
import { AIAgent } from '../../../../lib/agent.js'

export async function POST(request) {
  try {
    const body = await request.json()
    
    console.log('Calendar webhook received:', body)

    // Handle different types of calendar events
    const { resourceId, resourceUri, channelId, expiration } = body

    if (!resourceId) {
      return NextResponse.json({ error: 'Missing resourceId' }, { status: 400 })
    }

    // Get the Google Calendar API client
    const { google } = await import('googleapis')
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

    // Get the updated event details
    const eventResponse = await calendar.events.get({
      calendarId: 'primary',
      eventId: resourceId
    })

    const event = eventResponse.data
    
    // Process the calendar event for RAG
    const eventData = {
      id: event.id,
      title: event.summary,
      description: event.description,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      attendees: event.attendees?.map(a => a.email) || [],
      location: event.location,
      organizer: event.organizer?.email,
      status: event.status
    }

    // Add to knowledge base
    await processCalendarEvent(eventData)

    // Trigger AI agent for proactive actions
    await handleProactiveCalendarActions(eventData)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Calendar webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleProactiveCalendarActions(eventData) {
  try {
    const agent = new AIAgent()
    
    // Check if this is a new event (not updated)
    const isNewEvent = eventData.status === 'confirmed' && 
                      new Date(eventData.start) > new Date()

    if (isNewEvent) {
      // Check for client meetings
      const clientKeywords = ['client', 'meeting', 'consultation', 'review']
      const isClientMeeting = clientKeywords.some(keyword => 
        eventData.title?.toLowerCase().includes(keyword) ||
        eventData.description?.toLowerCase().includes(keyword)
      )

      if (isClientMeeting) {
        // Create a task to prepare for the meeting
        await createTask({
          userId: 'system', // You'll need to map calendar to user
          title: `Prepare for: ${eventData.title}`,
          description: `Meeting scheduled for ${new Date(eventData.start).toLocaleString()}\n\nAttendees: ${eventData.attendees.join(', ')}\n\nLocation: ${eventData.location || 'No location specified'}`,
          dueDate: new Date(new Date(eventData.start).getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours before
          priority: 'high',
          status: 'pending'
        })

        // Check if we need to send preparation emails
        if (eventData.attendees.length > 0) {
          // TODO: Send preparation emails to attendees
          console.log(`Should send preparation emails to: ${eventData.attendees.join(', ')}`)
        }
      }

      // Check for recurring events
      if (eventData.recurringEventId) {
        await createTask({
          userId: 'system',
          title: `Recurring Event: ${eventData.title}`,
          description: `Recurring meeting scheduled. Consider if this needs review or changes.`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
          priority: 'medium',
          status: 'pending'
        })
      }
    }

    // Check for cancelled events
    if (eventData.status === 'cancelled') {
      await createTask({
        userId: 'system',
        title: `Cancelled Event: ${eventData.title}`,
        description: `Event was cancelled. Consider rescheduling or notifying attendees.`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        priority: 'medium',
        status: 'pending'
      })
    }

  } catch (error) {
    console.error('Error handling proactive calendar actions:', error)
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Calendar webhook endpoint',
    description: 'Handles Google Calendar push notifications for events',
    usage: 'POST with Calendar webhook payload'
  })
} 
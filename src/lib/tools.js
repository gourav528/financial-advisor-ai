import { google } from 'googleapis'
import { getHubSpotClient } from './hubspot.js'
import { createTask, updateTask } from './database.js'
import { getServerSession } from "next-auth/next"
import { authOptions } from "../app/api/auth/[...nextauth]/route.js"

// Helper function to get Google access token from NextAuth session
export async function getGoogleToken() {
  try {
    const session = await getServerSession(authOptions)
    console.log('NextAuth session:', session ? 'exists' : 'null')
    console.log('Access token:', session?.accessToken ? 'present' : 'missing')
    return session?.accessToken
  } catch (error) {
    console.error('Error getting Google token:', error)
    return null
  }
}

// Gmail API setup
const gmail = google.gmail('v1')

// Create OAuth2 client only if credentials are available
async function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  
  if (!clientId || !clientSecret) {
    console.warn('Google OAuth credentials not configured')
    return null
  }
  
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  
  // Try to get tokens from NextAuth session
  try {
    const accessToken = await getGoogleToken()
    console.log('OAuth2Client - Access token retrieved:', accessToken ? 'yes' : 'no')
    
    if (accessToken) {
      oauth2Client.setCredentials({
        access_token: accessToken,
      })
      console.log('OAuth2Client - Credentials set successfully')
    } else {
      console.warn('OAuth2Client - No access token available')
    }
  } catch (error) {
    console.warn('Could not get Google tokens from NextAuth session:', error)
  }
  
  return oauth2Client
}

// Tool definitions
export const tools = [
  {
    type: 'function',
    function: {
      name: 'search_emails',
      description: 'Search for emails in Gmail',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for emails'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email via Gmail',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address'
          },
          subject: {
            type: 'string',
            description: 'Email subject'
          },
          body: {
            type: 'string',
            description: 'Email body content'
          },
          threadId: {
            type: 'string',
            description: 'Gmail thread ID to reply to (optional)'
          }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_hubspot_contacts',
      description: 'Search for contacts in HubSpot',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for contacts'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_hubspot_contact',
      description: 'Create a new contact in HubSpot',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'Contact email address'
          },
          firstName: {
            type: 'string',
            description: 'Contact first name'
          },
          lastName: {
            type: 'string',
            description: 'Contact last name'
          },
          company: {
            type: 'string',
            description: 'Contact company'
          },
          phone: {
            type: 'string',
            description: 'Contact phone number'
          }
        },
        required: ['email']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_hubspot_note',
      description: 'Add a note to a HubSpot contact',
      parameters: {
        type: 'object',
        properties: {
          contactId: {
            type: 'string',
            description: 'HubSpot contact ID'
          },
          content: {
            type: 'string',
            description: 'Note content'
          }
        },
        required: ['contactId', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_calendar_events',
      description: 'Search for calendar events',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query for events'
          },
          timeMin: {
            type: 'string',
            description: 'Start time for search (ISO format)'
          },
          timeMax: {
            type: 'string',
            description: 'End time for search (ISO format)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new calendar event',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Event title'
          },
          description: {
            type: 'string',
            description: 'Event description'
          },
          start: {
            type: 'string',
            description: 'Event start time (ISO format)'
          },
          end: {
            type: 'string',
            description: 'Event end time (ISO format)'
          },
          attendees: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'List of attendee email addresses'
          },
          location: {
            type: 'string',
            description: 'Event location'
          }
        },
        required: ['title', 'start', 'end']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task for the agent to handle',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Task description'
          },
          context: {
            type: 'object',
            description: 'Additional context for the task'
          }
        },
        required: ['description']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Update an existing task',
      parameters: {
        type: 'object',
        properties: {
          taskId: {
            type: 'number',
            description: 'Task ID to update'
          },
          status: {
            type: 'string',
            description: 'New task status',
            enum: ['pending', 'in_progress', 'completed', 'failed']
          },
          result: {
            type: 'object',
            description: 'Task result data'
          }
        },
        required: ['taskId']
      }
    }
  }
]

// Tool implementations
export async function executeTool(toolName, parameters) {
  console.log(`Executing tool: ${toolName} with parameters:`, parameters)
  
  try {
    switch (toolName) {
      case 'search_emails':
        return await searchEmails(parameters)
      case 'send_email':
        return await sendEmail(parameters)
      case 'search_hubspot_contacts':
        return await searchHubSpotContacts(parameters)
      case 'create_hubspot_contact':
        return await createHubSpotContact(parameters)
      case 'add_hubspot_note':
        return await addHubSpotNote(parameters)
      case 'search_calendar_events':
        return await searchCalendarEvents(parameters)
      case 'create_calendar_event':
        return await createCalendarEvent(parameters)
      case 'create_task':
        return await createTask(parameters.description, parameters.context)
      case 'update_task':
        return await updateTask(parameters.taskId, {
          status: parameters.status,
          result: parameters.result
        })
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error)
    return {
      success: false,
      error: error.message,
      toolName,
      parameters
    }
  }
}

// Gmail tools
async function searchEmails({ query, maxResults = 10 }) {
  try {
    console.log('Searching emails with query:', query)
    
    const oauth2Client = await getOAuth2Client()
    console.log('OAuth2Client created:', !!oauth2Client)
    
    if (!oauth2Client) {
      console.log('OAuth2Client is null - Google OAuth not configured')
      return {
        success: false,
        error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        emails: []
      }
    }

    // Check if we have valid credentials
    const credentials = oauth2Client.credentials
    console.log('OAuth2Client credentials:', !!credentials, 'Access token:', !!credentials?.access_token)
    
    if (!credentials || !credentials.access_token) {
      console.log('No valid credentials found')
      return {
        success: false,
        error: 'Not authenticated with Google. Please sign in with Google first.',
        emails: []
      }
    }
    
    console.log('Making Gmail API call with query:', query)
    const response = await gmail.users.messages.list({
      auth: oauth2Client,
      userId: 'me',
      q: query,
      maxResults
    })

    console.log('Gmail API response received:', response.data.messages?.length || 0, 'messages')
    const messages = response.data.messages || []
    
    console.log('Fetching detailed message data...')
    const detailedMessages = await Promise.all(
      messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          auth: oauth2Client,
          userId: 'me',
          id: message.id
        })
        return details.data
      })
    )
    console.log('Detailed messages fetched:', detailedMessages.length)

    return {
      success: true,
      emails: detailedMessages
    }
  } catch (error) {
    console.error('Error searching emails:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function sendEmail({ to, subject, body, threadId }) {
  try {
    const oauth2Client = await getOAuth2Client()
    
    if (!oauth2Client) {
      return {
        success: false,
        error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        messageId: null,
        threadId: null
      }
    }

    // Check if we have valid credentials
    const credentials = oauth2Client.credentials
    if (!credentials || !credentials.access_token) {
      return {
        success: false,
        error: 'Not authenticated with Google. Please sign in with Google first.',
        messageId: null,
        threadId: null
      }
    }
    
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      '',
      body
    ].join('\n')

    const encodedMessage = Buffer.from(message).toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const request = {
      auth: oauth2Client,
      userId: 'me',
      resource: {
        raw: encodedMessage,
        threadId: threadId
      }
    }

    const response = await gmail.users.messages.send(request)
    
    return {
      success: true,
      messageId: response.data.id,
      threadId: response.data.threadId
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// HubSpot tools
async function searchHubSpotContacts({ query, limit = 10 }) {
  try {
    const hubspotClient = await getHubSpotClient()
    
    // Check if we're using the mock client
    if (!hubspotClient || !hubspotClient.crm) {
      return {
        success: false,
        error: 'HubSpot not configured. Please connect your HubSpot account.',
        contacts: []
      }
    }
    
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      query: query,
      limit: limit
    })

    return {
      success: true,
      contacts: response.results
    }
  } catch (error) {
    console.error('Error searching HubSpot contacts:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function createHubSpotContact({ email, firstName, lastName, company, phone }) {
  try {
    const hubspotClient = await getHubSpotClient()
    
    // Check if we're using the mock client
    if (!hubspotClient || !hubspotClient.crm) {
      return {
        success: false,
        error: 'HubSpot not configured. Please connect your HubSpot account.',
        contact: null
      }
    }
    
    const properties = {
      email,
      firstname: firstName,
      lastname: lastName,
      company,
      phone
    }

    const response = await hubspotClient.crm.contacts.basicApi.create({
      properties
    })

    return {
      success: true,
      contact: response
    }
  } catch (error) {
    console.error('Error creating HubSpot contact:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function addHubSpotNote({ contactId, content }) {
  try {
    const hubspotClient = await getHubSpotClient()
    
    // Check if we're using the mock client
    if (!hubspotClient || !hubspotClient.crm) {
      return {
        success: false,
        error: 'HubSpot not configured. Please connect your HubSpot account.',
        note: null
      }
    }
    
    const response = await hubspotClient.crm.objects.notes.basicApi.create({
      properties: {
        hs_note_body: content,
        hs_timestamp: new Date().toISOString()
      },
      associations: [
        {
          to: {
            id: contactId
          },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 1
            }
          ]
        }
      ]
    })

    return {
      success: true,
      note: response
    }
  } catch (error) {
    console.error('Error adding HubSpot note:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Calendar tools
async function searchCalendarEvents({ query, timeMin, timeMax }) {
  try {
    const oauth2Client = await getOAuth2Client()
    
    if (!oauth2Client) {
      return {
        success: false,
        error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        events: []
      }
    }
    
    const calendar = google.calendar('v3')
    
    const response = await calendar.events.list({
      auth: oauth2Client,
      calendarId: 'primary',
      q: query,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime'
    })

    return {
      success: true,
      events: response.data.items
    }
  } catch (error) {
    console.error('Error searching calendar events:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

async function createCalendarEvent({ title, description, start, end, attendees, location }) {
  try {
    const oauth2Client = await getOAuth2Client()
    
    if (!oauth2Client) {
      return {
        success: false,
        error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
        event: null
      }
    }
    
    const calendar = google.calendar('v3')
    
    const event = {
      summary: title,
      description: description,
      start: {
        dateTime: start,
        timeZone: 'America/New_York'
      },
      end: {
        dateTime: end,
        timeZone: 'America/New_York'
      },
      attendees: attendees?.map(email => ({ email })),
      location: location
    }

    const response = await calendar.events.insert({
      auth: oauth2Client,
      calendarId: 'primary',
      resource: event,
      sendUpdates: 'all'
    })

    return {
      success: true,
      event: response.data
    }
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 
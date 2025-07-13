import { NextResponse } from 'next/server'
import { processEmail } from '../../../../lib/rag.js'
import { createTask } from '../../../../lib/database.js'
import { AIAgent } from '../../../../lib/agent.js'

export async function POST(request) {
  try {
    const body = await request.json()
    
    // Verify webhook signature (implement proper verification)
    // const signature = request.headers.get('x-hub-signature-256')
    // if (!verifySignature(body, signature)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    console.log('Gmail webhook received:', body)

    // Handle different types of Gmail events
    const { historyId, emailAddress } = body

    if (!historyId || !emailAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the Gmail API client
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

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Get history of changes
    const historyResponse = await gmail.users.history.list({
      userId: 'me',
      startHistoryId: historyId,
      historyTypes: ['messageAdded']
    })

    const history = historyResponse.data.history || []
    
    for (const change of history) {
      if (change.messagesAdded) {
        for (const messageAdded of change.messagesAdded) {
          const messageId = messageAdded.message.id
          
          // Get the full message details
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full'
          })

          const message = messageResponse.data
          
          // Process the email for RAG
          const emailData = {
            id: message.id,
            threadId: message.threadId,
            from: message.payload.headers.find(h => h.name === 'From')?.value,
            to: message.payload.headers.find(h => h.name === 'To')?.value,
            subject: message.payload.headers.find(h => h.name === 'Subject')?.value,
            date: message.payload.headers.find(h => h.name === 'Date')?.value,
            body: extractEmailBody(message.payload)
          }

          // Add to knowledge base
          await processEmail(emailData)

          // Trigger AI agent for proactive actions
          await handleProactiveEmailActions(emailData)
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Gmail webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractEmailBody(payload) {
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64').toString()
  }
  
  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64').toString()
      }
    }
  }
  
  return ''
}

async function handleProactiveEmailActions(emailData) {
  try {
    const agent = new AIAgent()
    
    // Check if this email requires immediate attention
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'important', 'critical']
    const isUrgent = urgentKeywords.some(keyword => 
      emailData.subject?.toLowerCase().includes(keyword) ||
      emailData.body?.toLowerCase().includes(keyword)
    )

    if (isUrgent) {
      // Create a task for urgent emails
      await createTask({
        userId: 'system', // You'll need to map email to user
        title: `Urgent Email: ${emailData.subject}`,
        description: `From: ${emailData.from}\n\n${emailData.body.substring(0, 200)}...`,
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        priority: 'high',
        status: 'pending'
      })

      // Send immediate response if needed
      // await agent.processMessage(`Urgent email received from ${emailData.from}: ${emailData.subject}`)
    }

    // Check for meeting requests
    if (emailData.subject?.toLowerCase().includes('meeting') || 
        emailData.body?.toLowerCase().includes('meeting')) {
      
      await createTask({
        userId: 'system',
        title: `Meeting Request: ${emailData.subject}`,
        description: `Meeting request from ${emailData.from}\n\n${emailData.body.substring(0, 200)}...`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        priority: 'medium',
        status: 'pending'
      })
    }

  } catch (error) {
    console.error('Error handling proactive email actions:', error)
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Gmail webhook endpoint',
    description: 'Handles Gmail push notifications for new emails',
    usage: 'POST with Gmail webhook payload'
  })
} 
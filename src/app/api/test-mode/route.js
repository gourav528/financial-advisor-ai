import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Simple offline responses for testing
    const responses = {
      'hello': 'Hello! I\'m your AI assistant in test mode. How can I help you today?',
      'help': 'I can help you with various tasks. In test mode, I can demonstrate the interface and basic functionality.',
      'test': 'Test mode is working! The system is functioning correctly.',
      'who mentioned baseball': 'Based on the test data, Sara Smith mentioned her son plays baseball in an email about college planning.',
      'greg aapl': 'Greg Johnson mentioned wanting to sell AAPL stock due to concerns about market volatility.',
      'schedule': 'I can help you schedule appointments. In test mode, I would use the calendar tools to create events.',
      'hubspot': 'I can help you manage HubSpot contacts and notes. In test mode, I would use the HubSpot API tools.',
      'email': 'I can help you search and send emails. In test mode, I would use the Gmail API tools.',
      'default': 'I understand your message. In test mode, I can demonstrate the interface and show how the system would work with real AI integration.'
    }

    const lowerMessage = message.toLowerCase()
    let response = responses.default

    for (const [key, value] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        response = value
        break
      }
    }

    // Simulate tool results for certain queries
    let toolResults = []
    if (lowerMessage.includes('schedule')) {
      toolResults = [{
        tool_name: 'create_calendar_event',
        result: { success: true, message: 'Test calendar event created' }
      }]
    } else if (lowerMessage.includes('hubspot')) {
      toolResults = [{
        tool_name: 'search_hubspot_contacts',
        result: { success: true, contacts: [{ name: 'Test Contact', email: 'test@example.com' }] }
      }]
    } else if (lowerMessage.includes('email')) {
      toolResults = [{
        tool_name: 'search_emails',
        result: { success: true, emails: [{ subject: 'Test Email', from: 'test@example.com' }] }
      }]
    }

    return NextResponse.json({
      success: true,
      response,
      toolResults,
      context: 'Test mode - using simulated responses',
      mode: 'test'
    })

  } catch (error) {
    console.error('Error in test mode API:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test mode API',
    description: 'This endpoint provides simulated responses for testing without OpenAI',
    usage: 'POST with {"message": "your message"}'
  })
} 
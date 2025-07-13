import { NextResponse } from 'next/server'
import { AIAgent } from '../../../lib/agent.js'
import { initializeDatabase } from '../../../lib/database.js'
import { getGoogleToken } from '../../../lib/tools.js'

// Initialize database on startup
initializeDatabase().catch(console.error)

// Create a singleton agent instance
const agent = new AIAgent()

export async function POST(request) {
  try {
    const { message, userId } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Check authentication status
    const googleToken = await getGoogleToken()
    const authStatus = {
      authenticated: !!googleToken,
      message: googleToken ? 'Authenticated with Google' : 'Not authenticated with Google'
    }

    // Process the message with the AI agent
    const result = await agent.processMessage(message, userId)

    return NextResponse.json({
      success: true,
      response: result.response,
      toolResults: result.toolResults || [],
      context: result.context,
      error: result.error,
      authStatus
    })

  } catch (error) {
    console.error('Error in chat API:', error)
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
    message: 'Chat API is running',
    status: 'ok'
  })
} 
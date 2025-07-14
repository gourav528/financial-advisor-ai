import OpenAI from 'openai'
import { searchContext, buildContext } from './rag.js'
import { tools, executeTool } from './tools.js'
import { getActiveInstructions } from './database.js'

// Initialize OpenAI client only if API key is available
let openai = null
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

// System prompt for the AI agent
const SYSTEM_PROMPT = `You are an AI financial advisor assistant that helps manage client relationships, emails, and scheduling. You have access to these tools:

**Gmail Tools:**
- search_emails: Search for emails in Gmail using queries
- send_email: Send emails to recipients

**HubSpot Tools:**
- search_hubspot_contacts: Search for contacts in HubSpot
- create_hubspot_contact: Create new contacts in HubSpot
- add_hubspot_note: Add notes to HubSpot contacts

**Calendar Tools:**
- search_calendar_events: Search for calendar events
- create_calendar_event: Create new calendar events

**Task Management:**
- create_task: Create new tasks
- update_task: Update task status

**Your capabilities:**
- Answer questions about clients using information from emails and HubSpot
- Schedule appointments and manage calendar events
- Send emails and manage email threads
- Create and update HubSpot contacts and notes
- Handle multi-step tasks that require waiting for responses
- Remember ongoing instructions and apply them proactively

**Important:** When users ask about emails, contacts, or calendar events, ALWAYS use the appropriate tools to search for and retrieve the information. Do not say you cannot access emails - you have access to Gmail, HubSpot, and Calendar APIs.

When a user asks a question, search the knowledge base for relevant context and provide a helpful answer. When asked to perform actions, use the available tools to accomplish the task.

Always be professional, helpful, and proactive in managing client relationships.`

export class AIAgent {
  constructor() {
    this.conversationHistory = []
    this.activeInstructions = []
    this.loadActiveInstructions()
  }

  async loadActiveInstructions() {
    try {
      this.activeInstructions = await getActiveInstructions()
    } catch (error) {
      console.error('Error loading active instructions:', error)
    }
  }

  async processMessage(userMessage) {
    // TODO: Implement user-specific features using userId
    try {
      // Check if OpenAI is available
      const openaiAvailable = process.env.OPENAI_API_KEY 
      
      if (!openaiAvailable) {
        return this.getOfflineResponse(userMessage)
      }
      
      // Search for relevant context
      const context = await this.getRelevantContext(userMessage)
      
      // Build conversation history
      const messages = this.buildConversationMessages(userMessage, context)
      
      // Get response from OpenAI with tool calling
      const response = await this.getAIResponse(messages)
      
      // Handle tool calls if any
      const toolResults = await this.handleToolCalls(response)
      
      // Update conversation history
      this.conversationHistory.push({
        role: 'user',
        content: userMessage
      })
      
      if (toolResults.length > 0) {
        // Add the initial assistant response with tool calls
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls
        })
        
        // Add tool response messages for each tool call
        for (const toolResult of toolResults) {
          this.conversationHistory.push({
            role: 'tool',
            content: JSON.stringify(toolResult.result),
            tool_call_id: toolResult.tool_call_id
          })
        }
        
        // Give AI a second chance to respond with tool results
        const finalResponse = await this.getAIResponseWithToolResults(toolResults)
        
        this.conversationHistory.push({
          role: 'assistant',
          content: finalResponse.content
        })
        
        return {
          response: finalResponse.content,
          toolResults,
          context: this.buildToolResultsContext(toolResults)
        }
      } else {
        this.conversationHistory.push({
          role: 'assistant',
          content: response.content
        })
        
        return {
          response: response.content,
          toolResults,
          context: context.length > 0 ? 'Found relevant context from knowledge base' : 'No relevant context found'
        }
      }
      
    } catch (error) {
      console.error('Error processing message:', error)
      
      // Check if it's an OpenAI quota/access issue
      if (error.message.includes('quota exceeded') || error.message.includes('model not available')) {
        return this.getOfflineResponse(userMessage, error.message)
      }
      
      return {
        response: 'I apologize, but I encountered an error processing your request. Please try again.',
        error: error.message
      }
    }
  }

  // Offline response when OpenAI is not available
  getOfflineResponse(userMessage, errorMessage = null) {
    const responses = {
      'hello': 'Hello! I\'m your AI assistant. I\'m currently in offline mode due to OpenAI service issues.',
      'help': 'I can help you with various tasks. Currently, I\'m in offline mode, but I can still provide basic assistance.',
      'test': 'I\'m working! This is a test response from offline mode.',
      'default': 'I understand your message. I\'m currently in offline mode due to OpenAI service issues. Please try again later when the service is restored.'
    }
    
    const lowerMessage = userMessage.toLowerCase()
    let response = responses.default
    
    for (const [key, value] of Object.entries(responses)) {
      if (lowerMessage.includes(key)) {
        response = value
        break
      }
    }
    
    if (errorMessage) {
      response += `\n\nError: ${errorMessage}`
    }
    
    return {
      response,
      toolResults: [],
      context: 'Offline mode - OpenAI service unavailable',
      error: errorMessage
    }
  }

  async getRelevantContext(query) {
    try {
      const searchResults = await searchContext(query, 5)
      return searchResults
    } catch (error) {
      console.error('Error searching context:', error)
      return []
    }
  }

  buildConversationMessages(userMessage, context) {
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      }
    ]

    // Add active instructions as context
    if (this.activeInstructions.length > 0) {
      const instructionsText = this.activeInstructions
        .map(instruction => instruction.instruction)
        .join('\n')
      
      messages.push({
        role: 'system',
        content: `Ongoing instructions to follow:\n${instructionsText}`
      })
    }

    // Add relevant context if available
    if (context.length > 0) {
      const contextText = buildContext(context)
      messages.push({
        role: 'system',
        content: `Relevant information from your knowledge base:\n${contextText}`
      })
    }

    // Add conversation history (last 10 messages to avoid token limits)
    const recentHistory = this.conversationHistory.slice(-10)
    messages.push(...recentHistory)

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage
    })

    return messages
  }

  async getAIResponse(messages) {
    try {
      // Check if OpenAI is available
      if (!openai) {
        throw new Error('OpenAI API key not configured')
      }

      // Validate tools format before sending to OpenAI
      const validTools = tools.filter(tool => 
        tool.type === 'function' && 
        tool.function && 
        tool.function.name && 
        tool.function.parameters
      )

      if (validTools.length === 0) {
        console.warn('No valid tools found, proceeding without tools')
        const response = await openai.chat.completions.create({
          model: 'gpt-4.1-mini',
          messages,
          temperature: 0.7,
          max_tokens: 2000
        })
        return response.choices[0].message
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',  // Updated to current model
        messages,
        tools: validTools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 2000
      })

      return response.choices[0].message
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Handle quota exceeded or model access issues
      if (error.status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing and try again later.')
      } else if (error.status === 404) {
        throw new Error('OpenAI model not available. Please check your API access.')
      } else if (error.message.includes('Missing required parameter')) {
        console.error('Tools format error:', error.message)
        throw new Error('Tool configuration error. Please check the tools format.')
      }
      
      throw error
    }
  }

  async handleToolCalls(response) {
    const toolResults = []

    if (response.tool_calls && response.tool_calls.length > 0) {
      for (const toolCall of response.tool_calls) {
        try {
          const toolName = toolCall.function.name
          const parameters = JSON.parse(toolCall.function.arguments)
          
          console.log(`Executing tool: ${toolName}`, parameters)
          
          const result = await executeTool(toolName, parameters)
          
          toolResults.push({
            tool_call_id: toolCall.id,
            tool_name: toolName,
            result
          })
          
        } catch (error) {
          console.error('Error executing tool:', error)
          toolResults.push({
            tool_call_id: toolCall.id,
            tool_name: toolCall.function.name,
            result: {
              success: false,
              error: error.message
            }
          })
        }
      }
    }

    return toolResults
  }

  async getAIResponseWithToolResults(toolResults) {
    try {
      // Check if OpenAI is available
      if (!openai) {
        throw new Error('OpenAI API key not configured')
      }

      // Build a message with tool results as context
      const toolResultsContext = this.buildToolResultsContext(toolResults)
      
      // Get the original user message from conversation history
      const userMessages = this.conversationHistory.filter(msg => msg.role === 'user')
      const originalUserMessage = userMessages[userMessages.length - 1]?.content || 'Please analyze the search results'
      
      // Create a clean message array without problematic tool messages
      const messages = [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'system',
          content: `Tool results have been obtained. Please analyze and respond to the user's request based on these results:\n\n${toolResultsContext}`
        },
        {
          role: 'user',
          content: originalUserMessage
        }
      ]

      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })

      return response.choices[0].message
    } catch (error) {
      console.error('Error getting AI response with tool results:', error)
      return {
        content: 'I found some information, but I encountered an error processing it. Please try again.'
      }
    }
  }

  buildToolResultsContext(toolResults) {
    let context = ''
    
    for (const toolResult of toolResults) {
      const { tool_name, result } = toolResult
      
      if (result.success) {
        switch (tool_name) {
          case 'search_emails':
            if (result.emails && result.emails.length > 0) {
              context += `\nEmail Search Results (${result.emails.length} emails found):\n`
              result.emails.forEach((email, index) => {
                const headers = email.payload?.headers || []
                const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject'
                const from = headers.find(h => h.name === 'From')?.value || 'Unknown sender'
                const date = headers.find(h => h.name === 'Date')?.value || 'Unknown date'
                
                context += `\nEmail ${index + 1}:\n`
                context += `From: ${from}\n`
                context += `Subject: ${subject}\n`
                context += `Date: ${date}\n`
                
                // Add email body if available
                if (email.snippet) {
                  context += `Snippet: ${email.snippet}\n`
                }
                
                // Try to get full body content
                if (email.payload?.body?.data) {
                  const bodyData = Buffer.from(email.payload.body.data, 'base64').toString()
                  context += `Content: ${bodyData}\n`
                } else if (email.payload?.parts) {
                  // Handle multipart emails
                  for (const part of email.payload.parts) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                      const bodyData = Buffer.from(part.body.data, 'base64').toString()
                      context += `Content: ${bodyData}\n`
                      break
                    }
                  }
                }
                context += '\n'
              })
            } else {
              context += '\nNo emails found matching the search criteria.\n'
            }
            break
            
          case 'search_hubspot_contacts':
            if (result.contacts && result.contacts.length > 0) {
              context += `\nHubSpot Contact Search Results (${result.contacts.length} contacts found):\n`
              result.contacts.forEach((contact, index) => {
                context += `\nContact ${index + 1}:\n`
                context += `Name: ${contact.properties?.firstname || ''} ${contact.properties?.lastname || ''}\n`
                context += `Email: ${contact.properties?.email || 'No email'}\n`
                context += `Company: ${contact.properties?.company || 'No company'}\n`
                context += `Phone: ${contact.properties?.phone || 'No phone'}\n`
              })
            } else {
              context += '\nNo HubSpot contacts found matching the search criteria.\n'
            }
            break
            
          case 'search_calendar_events':
            if (result.events && result.events.length > 0) {
              context += `\nCalendar Event Search Results (${result.events.length} events found):\n`
              result.events.forEach((event, index) => {
                context += `\nEvent ${index + 1}:\n`
                context += `Title: ${event.summary || 'No title'}\n`
                context += `Start: ${event.start?.dateTime || event.start?.date || 'No start time'}\n`
                context += `End: ${event.end?.dateTime || event.end?.date || 'No end time'}\n`
                context += `Description: ${event.description || 'No description'}\n`
              })
            } else {
              context += '\nNo calendar events found matching the search criteria.\n'
            }
            break
            
          default:
            context += `\nTool ${tool_name} executed successfully.\n`
            if (result.data) {
              context += `Result: ${JSON.stringify(result.data, null, 2)}\n`
            }
        }
      } else {
        context += `\nTool ${tool_name} failed: ${result.error || 'Unknown error'}\n`
      }
    }
    
    return context
  }

  // Method to handle proactive actions based on webhooks
  async handleProactiveAction(trigger, data) {
    try {
      // Reload active instructions
      await this.loadActiveInstructions()
      
      // Create a context message based on the trigger
      let contextMessage = ''
      switch (trigger) {
        case 'email_received':
          contextMessage = `New email received from ${data.from} with subject: ${data.subject}`
          break
        case 'contact_created':
          contextMessage = `New contact created in HubSpot: ${data.email}`
          break
        case 'calendar_event_created':
          contextMessage = `New calendar event created: ${data.title}`
          break
        default:
          contextMessage = `System event: ${trigger}`
        }

        // Check if any active instructions apply
        const relevantInstructions = this.activeInstructions.filter(instruction => {
          const instructionText = instruction.instruction.toLowerCase()
          return instructionText.includes(trigger) || 
                 instructionText.includes('when') ||
                 instructionText.includes('email') ||
                 instructionText.includes('contact') ||
                 instructionText.includes('calendar')
        })

        if (relevantInstructions.length > 0) {
          const instructionText = relevantInstructions
            .map(instruction => instruction.instruction)
            .join('\n')
          
          const proactiveMessage = `${contextMessage}\n\nConsider these ongoing instructions:\n${instructionText}\n\nShould any action be taken?`
          
          const result = await this.processMessage(proactiveMessage)
          return result
        }

        return null
      } catch (error) {
        console.error('Error handling proactive action:', error)
        return null
      }
    }

    // Method to add ongoing instruction
    async addInstruction(instruction) {
      try {
        const { addInstruction } = await import('./database.js')
        await addInstruction(instruction)
        await this.loadActiveInstructions()
        return { success: true }
      } catch (error) {
        console.error('Error adding instruction:', error)
        return { success: false, error: error.message }
      }
    }

    // Method to clear conversation history
    clearHistory() {
      this.conversationHistory = []
    }
  }
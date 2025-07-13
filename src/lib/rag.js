import OpenAI from 'openai'
import { insertEmbedding, searchEmbeddings } from './database.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Document processor for chunking text
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = []
  let start = 0
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    const chunk = text.slice(start, end)
    chunks.push(chunk)
    start = end - overlap
  }
  
  return chunks
}

// Generate embeddings for text
export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })
    return response.data[0].embedding
  } catch (error) {
    console.error('Error generating embedding:', error)
    
    // Handle quota exceeded error
    if (error.status === 429) {
      console.warn('OpenAI quota exceeded. Using fallback embedding.')
      // Return a mock embedding for development/testing
      return new Array(1536).fill(0).map(() => Math.random() - 0.5)
    }
    
    throw error
  }
}

// Process and store documents
export async function processDocument(content, metadata, source, sourceId) {
  try {
    // Chunk the content
    const chunks = chunkText(content)
    
    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(chunk => generateEmbedding(chunk))
    )
    
    // Store each chunk with its embedding
    const results = await Promise.all(
      chunks.map((chunk, index) => 
        insertEmbedding(
          chunk,
          embeddings[index],
          {
            ...metadata,
            chunkIndex: index,
            totalChunks: chunks.length
          },
          source,
          sourceId
        )
      )
    )
    
    return results
  } catch (error) {
    console.error('Error processing document:', error)
    throw error
  }
}

// Search for relevant context
export async function searchContext(query, limit = 10, filters = {}) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)
    
    // Search for similar embeddings
    const results = await searchEmbeddings(queryEmbedding, limit, filters)
    
    return results
  } catch (error) {
    console.error('Error searching context:', error)
    throw error
  }
}

// Build context for LLM
export function buildContext(searchResults, maxTokens = 4000) {
  let context = ''
  let tokenCount = 0
  
  for (const result of searchResults) {
    const content = result.content
    // Rough token estimation (1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(content.length / 4)
    
    if (tokenCount + estimatedTokens > maxTokens) {
      break
    }
    
    context += `Source: ${result.source}\nContent: ${content}\n\n`
    tokenCount += estimatedTokens
  }
  
  return context.trim()
}

// Process different types of documents
export async function processEmail(emailData) {
  const content = `
    From: ${emailData.from}
    To: ${emailData.to}
    Subject: ${emailData.subject}
    Date: ${emailData.date}
    Body: ${emailData.body}
  `
  
  const metadata = {
    type: 'email',
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    date: emailData.date,
    threadId: emailData.threadId
  }
  
  return processDocument(content, metadata, 'gmail', emailData.id)
}

export async function processHubSpotContact(contactData) {
  const content = `
    Name: ${contactData.firstName} ${contactData.lastName}
    Email: ${contactData.email}
    Company: ${contactData.company}
    Phone: ${contactData.phone}
    Notes: ${contactData.notes || ''}
    Properties: ${JSON.stringify(contactData.properties || {})}
  `
  
  const metadata = {
    type: 'hubspot_contact',
    contactId: contactData.id,
    email: contactData.email,
    company: contactData.company
  }
  
  return processDocument(content, metadata, 'hubspot', contactData.id)
}

export async function processHubSpotNote(noteData) {
  const content = `
    Contact: ${noteData.contactId}
    Note: ${noteData.content}
    Created: ${noteData.createdAt}
    Type: ${noteData.noteType}
  `
  
  const metadata = {
    type: 'hubspot_note',
    contactId: noteData.contactId,
    noteType: noteData.noteType,
    createdAt: noteData.createdAt
  }
  
  return processDocument(content, metadata, 'hubspot_notes', noteData.id)
}

export async function processCalendarEvent(eventData) {
  const content = `
    Title: ${eventData.title}
    Description: ${eventData.description || ''}
    Start: ${eventData.start}
    End: ${eventData.end}
    Attendees: ${eventData.attendees?.join(', ') || ''}
    Location: ${eventData.location || ''}
  `
  
  const metadata = {
    type: 'calendar_event',
    eventId: eventData.id,
    attendees: eventData.attendees,
    location: eventData.location
  }
  
  return processDocument(content, metadata, 'calendar', eventData.id)
} 
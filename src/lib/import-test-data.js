import { processEmail, processHubSpotContact, processHubSpotNote, processCalendarEvent } from './rag.js'

// Sample test data for importing into the vector database
export async function importTestData() {
  console.log('Importing test data...')

  // Sample emails
  const sampleEmails = [
    {
      id: 'email1',
      from: 'sara.smith@example.com',
      to: 'advisor@example.com',
      subject: 'Meeting Request',
      date: '2024-01-15T10:00:00Z',
      body: 'Hi, I would like to schedule a meeting to discuss my investment portfolio. My son plays baseball and I want to make sure we have enough saved for his college education.',
      threadId: 'thread1'
    },
    {
      id: 'email2',
      from: 'greg.johnson@example.com',
      to: 'advisor@example.com',
      subject: 'AAPL Stock Discussion',
      date: '2024-01-16T14:30:00Z',
      body: 'I\'m thinking about selling my AAPL stock. The company has been performing well but I\'m concerned about market volatility. What do you think?',
      threadId: 'thread2'
    },
    {
      id: 'email3',
      from: 'bill.wilson@example.com',
      to: 'advisor@example.com',
      subject: 'Retirement Planning',
      date: '2024-01-17T09:15:00Z',
      body: 'I need to review my retirement plan. I\'m 45 years old and want to make sure I\'m on track to retire at 65.',
      threadId: 'thread3'
    }
  ]

  // Sample HubSpot contacts
  const sampleContacts = [
    {
      id: 'contact1',
      firstName: 'Sara',
      lastName: 'Smith',
      email: 'sara.smith@example.com',
      company: 'Smith Consulting',
      phone: '+1-555-0123',
      notes: 'Interested in college planning for son who plays baseball. Has $50k in 529 plan.',
      properties: {
        lifecyclestage: 'lead',
        leadstatus: 'new'
      }
    },
    {
      id: 'contact2',
      firstName: 'Greg',
      lastName: 'Johnson',
      email: 'greg.johnson@example.com',
      company: 'Tech Solutions Inc',
      phone: '+1-555-0456',
      notes: 'Has significant AAPL holdings. Considering selling due to market concerns.',
      properties: {
        lifecyclestage: 'customer',
        leadstatus: 'qualified'
      }
    },
    {
      id: 'contact3',
      firstName: 'Bill',
      lastName: 'Wilson',
      email: 'bill.wilson@example.com',
      company: 'Wilson Manufacturing',
      phone: '+1-555-0789',
      notes: '45 years old, planning for retirement at 65. Current portfolio: $200k in 401k.',
      properties: {
        lifecyclestage: 'customer',
        leadstatus: 'qualified'
      }
    }
  ]

  // Sample HubSpot notes
  const sampleNotes = [
    {
      id: 'note1',
      contactId: 'contact1',
      content: 'Client called to discuss college planning. Son is 16 and plays baseball. Looking for advice on 529 plan vs other college savings options.',
      noteType: 'call',
      createdAt: '2024-01-15T11:00:00Z'
    },
    {
      id: 'note2',
      contactId: 'contact2',
      content: 'Greg is concerned about AAPL stock performance. Wants to discuss selling strategy and potential tax implications.',
      noteType: 'email',
      createdAt: '2024-01-16T15:00:00Z'
    },
    {
      id: 'note3',
      contactId: 'contact3',
      content: 'Bill wants to review retirement plan. Current savings: $200k in 401k, $50k in IRA. Needs to increase savings rate.',
      noteType: 'meeting',
      createdAt: '2024-01-17T10:00:00Z'
    }
  ]

  // Sample calendar events
  const sampleEvents = [
    {
      id: 'event1',
      title: 'Portfolio Review - Sara Smith',
      description: 'Discuss college planning and 529 plan options for son\'s education',
      start: '2024-01-20T10:00:00Z',
      end: '2024-01-20T11:00:00Z',
      attendees: ['sara.smith@example.com', 'advisor@example.com'],
      location: 'Conference Room A'
    },
    {
      id: 'event2',
      title: 'Investment Strategy - Greg Johnson',
      description: 'Review AAPL stock position and discuss selling strategy',
      start: '2024-01-22T14:00:00Z',
      end: '2024-01-22T15:00:00Z',
      attendees: ['greg.johnson@example.com', 'advisor@example.com'],
      location: 'Conference Room B'
    },
    {
      id: 'event3',
      title: 'Retirement Planning - Bill Wilson',
      description: 'Comprehensive retirement plan review and savings strategy',
      start: '2024-01-25T09:00:00Z',
      end: '2024-01-25T10:30:00Z',
      attendees: ['bill.wilson@example.com', 'advisor@example.com'],
      location: 'Conference Room A'
    }
  ]

  try {
    // Process emails
    console.log('Processing emails...')
    for (const email of sampleEmails) {
      await processEmail(email)
    }

    // Process contacts
    console.log('Processing contacts...')
    for (const contact of sampleContacts) {
      await processHubSpotContact(contact)
    }

    // Process notes
    console.log('Processing notes...')
    for (const note of sampleNotes) {
      await processHubSpotNote(note)
    }

    // Process calendar events
    console.log('Processing calendar events...')
    for (const event of sampleEvents) {
      await processCalendarEvent(event)
    }

    console.log('Test data import completed successfully!')
    return { success: true, message: 'Test data imported successfully' }
  } catch (error) {
    console.error('Error importing test data:', error)
    return { success: false, error: error.message }
  }
}

// Function to test the RAG system
export async function testRAGQueries() {
  const { searchContext } = await import('./rag.js')
  
  const testQueries = [
    'Who mentioned their kid plays baseball?',
    'Why did greg say he wanted to sell AAPL stock?',
    'What meetings are scheduled with Sara Smith?',
    'What is Bill Wilson\'s retirement plan?'
  ]

  console.log('Testing RAG queries...')
  
  for (const query of testQueries) {
    console.log(`\nQuery: ${query}`)
    try {
      const results = await searchContext(query, 3)
      console.log(`Found ${results.length} relevant results:`)
      results.forEach((result, index) => {
        console.log(`${index + 1}. Source: ${result.source}`)
        console.log(`   Content: ${result.content.substring(0, 100)}...`)
      })
    } catch (error) {
      console.error(`Error searching for "${query}":`, error)
    }
  }
} 
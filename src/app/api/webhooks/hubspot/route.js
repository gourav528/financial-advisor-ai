import { NextResponse } from 'next/server'
import { processHubSpotContact, processHubSpotNote } from '../../../../lib/rag.js'
import { createTask } from '../../../../lib/database.js'
// import { AIAgent } from '../../../../lib/agent.js'
import { getHubSpotClient } from '../../../../lib/hubspot.js'

export async function POST(request) {
  try {
    const body = await request.json()
    
    console.log('HubSpot webhook received:', body)

    // Handle different types of HubSpot events
    const { subscriptionType, objectId } = body

    if (!subscriptionType || !objectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get HubSpot client with proper token handling
    const hubspotClient = await getHubSpotClient()
    
    // Check if HubSpot client is properly configured
    if (!hubspotClient || !hubspotClient.crm) {
      console.warn('HubSpot client not properly configured')
      return NextResponse.json({ error: 'HubSpot not configured' }, { status: 401 })
    }

    // Handle different subscription types
    switch (subscriptionType) {
      case 'contact.creation':
      case 'contact.propertyChange':
        await handleContactEvent(objectId, hubspotClient)
        break
      
      case 'contact.deletion':
        // Handle contact deletion (remove from knowledge base)
        console.log(`Contact ${objectId} was deleted`)
        break
      
      case 'deal.creation':
      case 'deal.propertyChange':
        await handleDealEvent(objectId, hubspotClient)
        break
      
      case 'deal.deletion':
        console.log(`Deal ${objectId} was deleted`)
        break
      
      case 'note.creation':
        await handleNoteEvent(objectId, hubspotClient)
        break
      
      default:
        console.log(`Unhandled subscription type: ${subscriptionType}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('HubSpot webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleContactEvent(contactId, hubspotClient) {
  try {
    // Get contact details from HubSpot
    const contactResponse = await hubspotClient.crm.contacts.basicApi.getById(contactId)
    const contact = contactResponse
    
    // Process contact for RAG
    const contactData = {
      id: contact.id,
      firstName: contact.properties.firstname,
      lastName: contact.properties.lastname,
      email: contact.properties.email,
      company: contact.properties.company,
      phone: contact.properties.phone,
      notes: contact.properties.hs_note_body || '',
      properties: {
        lifecyclestage: contact.properties.lifecyclestage,
        leadstatus: contact.properties.hs_lead_status,
        dealstage: contact.properties.dealstage
      }
    }

    // Add to knowledge base
    await processHubSpotContact(contactData)

    // Trigger AI agent for proactive actions
    await handleProactiveContactActions(contactData)

  } catch (error) {
    console.error('Error handling contact event:', error)
  }
}

async function handleDealEvent(dealId, hubspotClient) {
  try {
    // Get deal details from HubSpot
    const dealResponse = await hubspotClient.crm.deals.basicApi.getById(dealId)
    const deal = dealResponse
    
    // Create task for deal updates
    await createTask({
      userId: 'system',
      title: `Deal Update: ${deal.properties.dealname}`,
      description: `Deal stage: ${deal.properties.dealstage}\nAmount: ${deal.properties.amount}\nClose date: ${deal.properties.closedate}`,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      priority: 'medium',
      status: 'pending'
    })

    // Check for high-value deals
    const amount = parseFloat(deal.properties.amount)
    if (amount > 10000) {
      await createTask({
        userId: 'system',
        title: `High-Value Deal: ${deal.properties.dealname}`,
        description: `High-value deal worth $${amount.toLocaleString()}. Consider special attention.`,
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        priority: 'high',
        status: 'pending'
      })
    }

  } catch (error) {
    console.error('Error handling deal event:', error)
  }
}

async function handleNoteEvent(noteId, hubspotClient) {
  try {
    // Get note details from HubSpot
    const noteResponse = await hubspotClient.crm.objects.notes.basicApi.getById(noteId)
    const note = noteResponse
    
    // Process note for RAG
    const noteData = {
      id: note.id,
      content: note.properties.hs_note_body,
      noteType: note.properties.hs_timestamp ? 'note' : 'activity',
      createdAt: note.properties.hs_timestamp,
      contactId: note.properties.hs_attachment_ids // This might need adjustment based on HubSpot API
    }

    // Add to knowledge base
    await processHubSpotNote(noteData)

    // Check for urgent notes
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'important', 'critical']
    const isUrgent = urgentKeywords.some(keyword => 
      noteData.content?.toLowerCase().includes(keyword)
    )

    if (isUrgent) {
      await createTask({
        userId: 'system',
        title: `Urgent Note: ${noteData.content.substring(0, 50)}...`,
        description: noteData.content,
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        priority: 'high',
        status: 'pending'
      })
    }

  } catch (error) {
    console.error('Error handling note event:', error)
  }
}

async function handleProactiveContactActions(contactData) {
  try {
    // const agent = new AIAgent()
    
    // Check for new leads
    if (contactData.properties.lifecyclestage === 'lead') {
      await createTask({
        userId: 'system',
        title: `New Lead: ${contactData.firstName} ${contactData.lastName}`,
        description: `New lead from ${contactData.company || 'Unknown company'}\nEmail: ${contactData.email}\nPhone: ${contactData.phone || 'No phone'}`,
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        priority: 'high',
        status: 'pending'
      })
    }

    // Check for qualified leads
    if (contactData.properties.leadstatus === 'qualified') {
      await createTask({
        userId: 'system',
        title: `Qualified Lead: ${contactData.firstName} ${contactData.lastName}`,
        description: `Lead has been qualified. Ready for sales process.`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        priority: 'medium',
        status: 'pending'
      })
    }

    // Check for customer conversions
    if (contactData.properties.lifecyclestage === 'customer') {
      await createTask({
        userId: 'system',
        title: `New Customer: ${contactData.firstName} ${contactData.lastName}`,
        description: `Contact converted to customer. Consider onboarding process.`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
        priority: 'medium',
        status: 'pending'
      })
    }

  } catch (error) {
    console.error('Error handling proactive contact actions:', error)
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'HubSpot webhook endpoint',
    description: 'Handles HubSpot push notifications for contacts, deals, and notes',
    usage: 'POST with HubSpot webhook payload'
  })
} 
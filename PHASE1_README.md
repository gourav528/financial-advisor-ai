# Phase 1: Foundation Implementation

## Overview

Phase 1 implements the core foundation of the AI financial advisor assistant with the following components:

1. **Vector Database Setup** - pgvector integration with Supabase
2. **RAG System** - Document processing and semantic search
3. **Basic Tool Calling Framework** - Gmail, HubSpot, and Calendar integrations
4. **AI Agent Core** - OpenAI integration with function calling
5. **Chat Interface** - Updated UI with real AI responses

## Architecture

### Database Schema

The system uses three main tables in Supabase with pgvector:

1. **embeddings** - Stores document chunks with vector embeddings
2. **tasks** - Manages long-running tasks with state persistence
3. **agent_memory** - Stores ongoing instructions for the AI agent

### Core Components

- `src/lib/database.js` - Database operations and pgvector setup
- `src/lib/rag.js` - RAG system for document processing and search
- `src/lib/tools.js` - Tool definitions and implementations
- `src/lib/agent.js` - AI agent with OpenAI integration
- `src/app/api/chat/route.js` - Main chat API endpoint

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
# Set to 'true' to force test mode (no OpenAI required)
FORCE_TEST_MODE=false

# Google APIs (for Gmail and Calendar)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
GOOGLE_ACCESS_TOKEN=your_access_token
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Note: Google OAuth setup is optional. The system will work without it.

# HubSpot
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/auth/hubspot/callback
HUBSPOT_ACCESS_TOKEN=your_hubspot_access_token
```

### 2. Database Setup

The system will automatically initialize the database tables when the chat API is first called. However, you can manually initialize:

```javascript
import { initializeDatabase } from './src/lib/database.js'
await initializeDatabase()
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Import Test Data

To test the system with sample data:

```bash
# Using curl
curl -X POST http://localhost:3000/api/import-test-data \
  -H "Content-Type: application/json" \
  -d '{"action": "import"}'

# Or using the browser
# Navigate to http://localhost:3000/api/import-test-data
# Use a tool like Postman to POST with {"action": "import"}
```

### 5. Google OAuth Setup (Optional)

For Gmail and Calendar functionality:

#### **Method 1: Built-in OAuth Flow (Recommended)**

1. **Create Google Cloud Project**:
   - Go to https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable APIs**:
   - Go to "APIs & Services" → "Library"
   - Enable Gmail API
   - Enable Google Calendar API

3. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URI: `http://localhost:3000/api/auth/google/callback`

4. **Set Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
   ```

5. **Use the App's OAuth Flow**:
   - Start your app: `npm run dev`
   - Go to the chat interface
   - Click "Connect Google" in the sidebar
   - Follow the OAuth flow to authorize access

#### **Method 2: Manual Token Setup (Development)**

1. **Use Google OAuth 2.0 Playground**:
   - Go to https://developers.google.com/oauthplayground/
   - Click settings (⚙️) → "Use your own OAuth credentials"
   - Enter your `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Select scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/calendar`
   - Click "Authorize APIs" → "Exchange authorization code for tokens"
   - Copy the `access_token` and `refresh_token`

2. **Set Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_ACCESS_TOKEN=your_access_token
   GOOGLE_REFRESH_TOKEN=your_refresh_token
   ```

**Note**: The system works without Google OAuth. Gmail and Calendar tools will show helpful error messages when not configured.

## Usage

### Basic Chat

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Log in with your credentials
4. Start chatting with the AI agent

### Example Queries

The AI can now handle queries like:

- "Who mentioned their kid plays baseball?"
- "Why did greg say he wanted to sell AAPL stock?"
- "Schedule an appointment with Sara Smith"
- "What meetings are scheduled with Bill Wilson?"

### Tool Capabilities

The AI agent has access to these tools:

**Gmail Tools:**
- `search_emails` - Search for emails
- `send_email` - Send emails

**HubSpot Tools:**
- `search_hubspot_contacts` - Search contacts
- `create_hubspot_contact` - Create new contacts
- `add_hubspot_note` - Add notes to contacts

**Calendar Tools:**
- `search_calendar_events` - Search calendar events
- `create_calendar_event` - Create calendar events

**Task Management:**
- `create_task` - Create new tasks
- `update_task` - Update task status

## Testing

### RAG System Test

Test the retrieval system:

```bash
curl -X POST http://localhost:3000/api/import-test-data \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}'
```

### Manual Testing

1. Import test data first
2. Ask questions about the sample data
3. Try scheduling tasks
4. Test tool calling capabilities

## Current Limitations

### Phase 1 Limitations

1. **No Real Data Integration** - Currently using test data only
2. **Basic Authentication** - Google/HubSpot OAuth not fully implemented
3. **No Webhook Handling** - Proactive actions not yet implemented
4. **Limited Error Handling** - Basic error handling in place
5. **No Task Persistence** - Tasks are not yet persisted across sessions

### Next Steps (Phase 2)

1. **Real Data Integration** - Connect to actual Gmail, HubSpot, and Calendar APIs
2. **OAuth Implementation** - Complete Google and HubSpot authentication
3. **Webhook System** - Implement webhook handling for proactive actions
4. **Task Management** - Build persistent task system with state management
5. **Memory System** - Implement ongoing instruction memory

## File Structure

```
src/
├── lib/
│   ├── database.js          # Database operations
│   ├── rag.js              # RAG system
│   ├── tools.js            # Tool definitions
│   ├── agent.js            # AI agent core
│   ├── hubspot.js          # HubSpot integration
│   ├── supabase.js         # Supabase client
│   └── import-test-data.js # Test data utilities
├── app/
│   ├── api/
│   │   ├── chat/           # Main chat API
│   │   ├── import-test-data/ # Test data API
│   │   └── hubspot/        # HubSpot APIs
│   ├── components/
│   │   └── Chat.js         # Updated chat interface
│   └── page.tsx            # Main page
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check Supabase credentials
   - Ensure pgvector extension is enabled

2. **OpenAI API Errors**
   - Verify API key is correct
   - Check API quota and billing
   - **Quota Exceeded (429)**: Add billing information to your OpenAI account
   - **Model Not Found (404)**: The system now uses `gpt-4o` model

3. **Tool Execution Errors**
   - Verify Google/HubSpot credentials
   - Check API permissions

4. **Vector Search Issues**
   - Ensure embeddings are being generated correctly
   - Check vector dimensions match (1536 for text-embedding-3-small)
   - **Fallback Mode**: System will use mock embeddings if OpenAI quota is exceeded

5. **Next.js 15 Compatibility**
   - **Cookies API**: All `cookies()` calls must be awaited
   - **Dynamic Functions**: Use `await cookies()` instead of `cookies()`

### Debug Mode

Enable debug logging by adding to your environment:

```bash
DEBUG=true
```

## Performance Notes

- Vector search is optimized for small to medium datasets
- Embedding generation uses OpenAI's text-embedding-3-small model
- Context window is limited to ~4000 tokens for LLM responses
- Tool calls are executed sequentially (can be optimized in Phase 2)

## Security Considerations

- API keys are stored in environment variables
- Database access uses service role key (restrict access)
- Tool execution is sandboxed
- User authentication required for chat access

---

**Phase 1 Complete!** The foundation is now ready for Phase 2 implementation. 
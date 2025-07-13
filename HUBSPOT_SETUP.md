# HubSpot OAuth Integration Setup Guide

This guide will help you set up the HubSpot OAuth integration for your financial advisor AI application.

## Prerequisites

1. A HubSpot developer account
2. A HubSpot app with OAuth credentials
3. Node.js and npm installed

## Step 1: Create HubSpot App

1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Sign in with your HubSpot account
3. Click "Create App"
4. Fill in the app details:
   - **App Name**: Financial Advisor AI
   - **App Description**: AI-powered financial advisor with CRM integration
   - **App Domain**: Your domain (e.g., `localhost:3000` for development)

## Step 2: Configure OAuth Settings

1. In your HubSpot app, go to "Auth" → "OAuth"
2. Add the following redirect URI:
   ```
   http://localhost:3000/api/auth/hubspot/callback
   ```
3. Note down your **Client ID** and **Client Secret**

## Step 3: Set Required Scopes

In your HubSpot app OAuth settings, add these scopes:
- `contacts` - Read and write contacts
- `oauth` - OAuth scopes
- `crm.objects.contacts.read` - Read contact objects
- `crm.objects.deals.read` - Read deal objects

## Step 4: Environment Variables

1. Copy `env.example` to `.env.local`
2. Fill in your HubSpot credentials:

```env
# HubSpot OAuth Configuration
HUBSPOT_CLIENT_ID=your_actual_client_id_here
HUBSPOT_CLIENT_SECRET=your_actual_client_secret_here
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/auth/hubspot/callback

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Other existing variables...
```

## Step 5: Install Dependencies

The required dependencies are already installed:
- `@hubspot/api-client` - HubSpot API client
- `next-auth` - Authentication framework

## Step 6: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your application
3. Click "Connect HubSpot" in the sidebar
4. Complete the OAuth flow
5. Verify that the connection status shows "Connected"

## API Endpoints Created

- `GET /api/auth/hubspot` - Initiates OAuth flow
- `GET /api/auth/hubspot/callback` - Handles OAuth callback
- `GET /api/hubspot/status` - Check connection status
- `POST /api/hubspot/disconnect` - Disconnect HubSpot
- `GET /api/hubspot/data` - Fetch HubSpot data

## Features Implemented

### Frontend (Chat.js)
- ✅ HubSpot connection status indicator
- ✅ Connect/Disconnect buttons
- ✅ Real-time sync status
- ✅ Data fetching and display
- ✅ OAuth callback handling

### Backend
- ✅ OAuth initiation endpoint
- ✅ Token exchange and storage
- ✅ HubSpot API integration
- ✅ Data fetching (contacts & deals)
- ✅ Connection status checking
- ✅ Secure token management

## Security Considerations

1. **Token Storage**: Currently using HTTP-only cookies. For production, consider:
   - Database storage with encryption
   - Redis with encryption
   - Secure key management services

2. **Environment Variables**: Never commit `.env.local` to version control

3. **HTTPS**: Use HTTPS in production for secure token transmission

## Production Deployment

1. Update `HUBSPOT_REDIRECT_URI` to your production domain
2. Set `NEXTAUTH_URL` to your production URL
3. Generate a strong `NEXTAUTH_SECRET`
4. Use secure token storage (database recommended)
5. Enable HTTPS

## Troubleshooting

### Common Issues

1. **"Client ID not configured"**
   - Check that `HUBSPOT_CLIENT_ID` is set in `.env.local`

2. **"Invalid redirect URI"**
   - Verify the redirect URI matches exactly in HubSpot app settings

3. **"Token exchange failed"**
   - Check that `HUBSPOT_CLIENT_SECRET` is correct
   - Verify scopes are properly configured

4. **"HubSpot not connected"**
   - Check browser console for errors
   - Verify cookies are being set properly

### Debug Steps

1. Check browser network tab for API calls
2. Verify environment variables are loaded
3. Check server logs for errors
4. Test OAuth flow in incognito mode

## Next Steps

After successful integration, consider:

1. **Data Synchronization**: Implement periodic sync
2. **Error Handling**: Add retry mechanisms
3. **Rate Limiting**: Respect HubSpot API limits
4. **Analytics**: Track usage and performance
5. **User Management**: Store user-specific tokens
6. **Webhooks**: Set up real-time data updates

## Support

For issues with:
- **HubSpot API**: Check [HubSpot API Documentation](https://developers.hubspot.com/docs/api/overview)
- **OAuth Flow**: Review [HubSpot OAuth Guide](https://developers.hubspot.com/docs/api/oauth-quickstart-guide)
- **Next.js**: Check [Next.js Documentation](https://nextjs.org/docs) 
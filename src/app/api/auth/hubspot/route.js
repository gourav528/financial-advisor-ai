import { NextResponse } from 'next/server';

export async function GET() {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI || 'http://localhost:3000/api/auth/hubspot/callback';

    console.log('HubSpot OAuth Debug Info:');
    console.log('Client ID:', clientId ? 'Set' : 'NOT SET');
    console.log('Redirect URI:', redirectUri);

    if (!clientId) {
        console.error('HubSpot client ID not configured');
        return NextResponse.json({ error: 'HubSpot client ID not configured' }, { status: 500 });
    }

    // Generate a random state parameter for security
    const state = Math.random().toString(36).substring(7);

    // Store state in session or database for verification
    // For now, we'll use a simple approach

    // Use basic scopes that work with most HubSpot accounts
    const scopes = [
        // 'contacts',
        'oauth',
        'crm.objects.contacts.read',
        'crm.objects.contacts.write',
        'crm.schemas.contacts.read',
        'crm.schemas.contacts.write'
    ].join(' ');

    const hubspotAuthUrl = `https://app.hubspot.com/oauth/authorize?` +
        `client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${state}`;

    console.log('Generated OAuth URL:', hubspotAuthUrl);

    return NextResponse.json({
        authUrl: hubspotAuthUrl,
        state: state
    });
} 
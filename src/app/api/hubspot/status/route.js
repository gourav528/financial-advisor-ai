import { NextResponse } from 'next/server';
import { isHubSpotConnected, getHubSpotTokens } from '@/lib/hubspot';

export async function GET() {
  try {
    const connected = await isHubSpotConnected();
    
    if (!connected) {
      return NextResponse.json({ connected: false });
    }

    const { userInfo } = await getHubSpotTokens();
    
    return NextResponse.json({
      connected: true,
      userInfo,
    });
  } catch (error) {
    console.error('Error checking HubSpot status:', error);
    return NextResponse.json({ connected: false, error: error.message });
  }
} 
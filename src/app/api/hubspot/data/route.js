import { NextResponse } from 'next/server';
import { getHubSpotData, isHubSpotConnected } from '@/lib/hubspot';

export async function GET() {
  try {
    const connected = await isHubSpotConnected();
    
    if (!connected) {
      return NextResponse.json({ error: 'HubSpot not connected' }, { status: 401 });
    }

    const data = await getHubSpotData();
    
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching HubSpot data:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 
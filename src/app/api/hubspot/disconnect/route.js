import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear all HubSpot-related cookies
    cookieStore.delete('hubspot_access_token');
    cookieStore.delete('hubspot_refresh_token');
    cookieStore.delete('hubspot_user_info');
    
    return NextResponse.json({ success: true, message: 'HubSpot disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting HubSpot:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
} 
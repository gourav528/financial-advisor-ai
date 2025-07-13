import { cookies } from 'next/headers';
import { Client } from '@hubspot/api-client';

// Create HubSpot client instance
let hubspotClient = null;

export async function getHubSpotClient() {
  try {
    // Get tokens from cookies (set during OAuth flow)
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('hubspot_access_token')?.value;
    
    if (!accessToken) {
      console.warn('HubSpot access token not found in cookies. HubSpot tools will not work.');
      // Return a mock client for development/testing
      return {
        crm: {
          contacts: {
            searchApi: {
              doSearch: async () => ({ results: [] })
            },
            basicApi: {
              create: async () => ({ id: 'mock-contact-id' })
            }
          },
          objects: {
            notes: {
              basicApi: {
                create: async () => ({ id: 'mock-note-id' })
              }
            }
          }
        }
      };
    }
    
    return new Client({
      accessToken: accessToken,
    });
  } catch (error) {
    console.error('Error getting HubSpot client:', error);
    // Return mock client on error
    return {
      crm: {
        contacts: {
          searchApi: {
            doSearch: async () => ({ results: [] })
          },
          basicApi: {
            create: async () => ({ id: 'mock-contact-id' })
          }
        },
        objects: {
          notes: {
            basicApi: {
              create: async () => ({ id: 'mock-note-id' })
            }
          }
        }
      }
    };
  }
}

// HubSpot API utility functions
export class HubSpotAPI {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://api.hubapi.com';
  }

  // Get contacts from HubSpot
  async getContacts(limit = 100) {
    try {
      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching HubSpot contacts:', error);
      throw error;
    }
  }

  // Get deals from HubSpot
  async getDeals(limit = 100) {
    try {
      const response = await fetch(`${this.baseUrl}/crm/v3/objects/deals?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deals: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching HubSpot deals:', error);
      throw error;
    }
  }

  // Get user info
  async getUserInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/oauth/v1/access-tokens/${this.accessToken}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching HubSpot user info:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: process.env.HUBSPOT_CLIENT_ID,
          client_secret: process.env.HUBSPOT_CLIENT_SECRET,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error refreshing HubSpot token:', error);
      throw error;
    }
  }
}

// Server-side functions
export async function getHubSpotTokens() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('hubspot_access_token')?.value;
  const refreshToken = cookieStore.get('hubspot_refresh_token')?.value;
  const userInfo = cookieStore.get('hubspot_user_info')?.value;

  return {
    accessToken,
    refreshToken,
    userInfo: userInfo ? JSON.parse(userInfo) : null,
  };
}

export async function isHubSpotConnected() {
  const { accessToken } = await getHubSpotTokens();
  return !!accessToken;
}

export async function getHubSpotData() {
  const { accessToken } = await getHubSpotTokens();
  
  if (!accessToken) {
    throw new Error('HubSpot not connected');
  }

  const hubspot = new HubSpotAPI(accessToken);


  try {
    const [contacts] = await Promise.all([
      hubspot.getContacts(50)
    ]);

    return {
      contacts: contacts.results || [],
      // deals: deals.results || [],
      // userInfo,
      lastSync: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching HubSpot data:', error);
    throw error;    
  }
}

// Client-side functions (for use in components)
export async function checkHubSpotConnection() {
  try {
    const response = await fetch('/api/hubspot/status');
    const data = await response.json();
    return data.connected;
  } catch (error) {
    console.error('Error checking HubSpot connection:', error);
    return false;
  }
}

export async function disconnectHubSpot() {
  try {
    const response = await fetch('/api/hubspot/disconnect', {
      method: 'POST',
    });
    return response.ok;
  } catch (error) {
    console.error('Error disconnecting HubSpot:', error);
    return false;
  }
} 
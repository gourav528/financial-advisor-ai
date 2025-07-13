'use client'
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';

export default function Chat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Context set to all meetings\n11:17am – May 13, 2025' },
    { role: 'user', content: 'Find meetings I\'ve had with Bill and Tim this month' },
    { role: 'assistant', content: 'Sure, here are some recent meetings that you, Bill, and Tim all attended. I found 2 in May.' },
    { role: 'assistant', content: '8 Thursday\n12 – 1:30pm\nQuarterly All Team Meeting' },
    { role: 'assistant', content: '16 Friday\n1 – 2pm\nStrategy review' },
    { role: 'assistant', content: 'I can summarize these meetings, schedule a follow up, and more!' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hubspotData, setHubspotData] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Also scroll when loading state changes (for better UX during AI responses)
  useEffect(() => {
    if (!isLoading) {
      // Small delay to ensure the new message is rendered
      setTimeout(scrollToBottom, 100);
    }
  }, [isLoading]);

  // Check HubSpot connection status on component mount
  useEffect(() => {
    checkHubSpotStatus();
  }, []);

  const checkHubSpotStatus = async () => {
    try {
      const response = await fetch('/api/hubspot/status');
      const data = await response.json();
      setHubspotConnected(data.connected);
      
      if (data.connected && data.userInfo) {
        setLastSync(new Date().toLocaleString());
      }
    } catch (error) {
      console.error('Error checking HubSpot status:', error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      // Try the main chat API first
      let response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          userId: session?.user?.id
        }),
      });
      
      let data = await response.json();
      
      // If main API fails due to OpenAI issues, try test mode
      if (!data.success && (data.error?.includes('quota') || data.error?.includes('OpenAI'))) {
        console.log('Switching to test mode due to OpenAI issues');
        response = await fetch('/api/test-mode', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage
          }),
        });
        
        data = await response.json();
      }
      
      if (data.success) {
        // Add AI response to chat
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response,
          toolResults: data.toolResults,
          context: data.context,
          mode: data.mode
        }]);
      } else {
        // Add error message
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${data.error || 'Failed to get response'}` 
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const connectHubspot = async () => {
    setIsConnecting(true);
    try {
      // Get the OAuth URL from our API
      const response = await fetch('/api/auth/hubspot');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Redirect to HubSpot OAuth page
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('Failed to connect HubSpot:', error);
      alert('Failed to connect HubSpot. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectHubspot = async () => {
    try {
      const response = await fetch('/api/hubspot/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setHubspotConnected(false);
        setHubspotData(null);
        setLastSync(null);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting HubSpot:', error);
      alert('Failed to disconnect HubSpot. Please try again.');
    }
  };

  const fetchHubspotData = async () => {
    try {
      const response = await fetch('/api/hubspot/data');
      const data = await response.json();
      
      if (data.success) {
        setHubspotData(data.data);
        setLastSync(new Date().toLocaleString());
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching HubSpot data:', error);
      alert('Failed to fetch HubSpot data. Please try again.');
    }
  };

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hubspotConnected = urlParams.get('hubspot_connected');
    const error = urlParams.get('error');
    
    if (hubspotConnected === 'true') {
      setHubspotConnected(true);
      setLastSync(new Date().toLocaleString());
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (error) {
      console.error('HubSpot OAuth error:', error);
      alert(`HubSpot connection failed: ${error}`);
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-black">Ask Anything</h2>
        </div>
        
        {/* CRM Integration Section */}
        <div className="p-4 border-b">
          <h3 className="text-sm font-medium text-gray-700 mb-3">CRM Integration</h3>
          
          {/* HubSpot Connection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-sm font-medium text-black">HubSpot CRM</span>
              </div>
              {hubspotConnected && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-green-600">Connected</span>
                </div>
              )}
            </div>
            
            {!hubspotConnected ? (
              <button
                onClick={connectHubspot}
                disabled={isConnecting}
                className="w-full px-3 py-2 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                    </svg>
                    Connect HubSpot
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={disconnectHubspot}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={fetchHubspotData}
                    className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Sync Now
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  ✓ Contacts synced<br />
                  ✓ Deals synced<br />
                  {lastSync && `✓ Last sync: ${lastSync}`}
                </div>
                {hubspotData && (
                  <div className="text-xs text-gray-500">
                    📊 {hubspotData.contacts.length} contacts<br />
                    {/* 💼 {hubspotData.deals.length} deals */}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          <button className="text-left px-3 py-2 rounded bg-gray-100 font-medium text-black">Chat</button>
          <button className="text-left px-3 py-2 rounded hover:bg-gray-100 text-black">History</button>
          {hubspotConnected && (
            <>
              <button 
                onClick={fetchHubspotData}
                className="text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
                HubSpot Data
              </button>
              <button className="text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Sync Status
              </button>
            </>
          )}
          <button className="text-left px-3 py-2 rounded hover:bg-gray-100 flex items-center gap-1 text-black">
            <span className="text-lg font-bold">+</span> New thread
          </button>
        </nav>
        
        {/* User section with sign out */}
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {session?.user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <div className="text-sm font-medium text-black">
                  {session?.user?.name || 'User'}
                </div>
                <div className="text-xs text-gray-500">
                  {session?.user?.email || 'user@example.com'}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
      
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full">
        {/* Chat messages area - scrollable */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="w-full max-w-xl mx-auto">
            {/* Context info */}
            <div className="text-xs text-gray-400 text-center mb-4">
              Context set to all meetings<br />11:17am – May 13, 2025
            </div>
            {/* Chat bubbles */}
            <div className="flex flex-col gap-4 mb-6">
              {messages.map((msg, idx) => (
                <div key={idx} className={
                  msg.role === 'user'
                    ? 'self-end bg-blue-100 text-gray-900 px-4 py-2 rounded-lg max-w-[80%]'
                    : msg.role === 'system'
                    ? 'text-xs text-gray-400 text-center'
                    : 'self-start bg-gray-100 text-gray-900 px-4 py-2 rounded-lg max-w-[80%]'
                }>
                  {msg?.content?.split('\n')?.map((line, i) => <div key={i}>{line}</div>)}
                  
                  {/* Show tool results if available */}
                  {msg.toolResults && msg.toolResults.length > 0 && (
                    <div className="mt-2 text-xs text-gray-600">
                      <div className="font-medium">Actions taken:</div>
                      {msg.toolResults.map((tool, toolIdx) => (
                        <div key={toolIdx} className="ml-2">
                          • {tool.tool_name}: {tool.result.success ? 'Success' : 'Failed'}
                          {tool.result.error && <span className="text-red-600"> - {tool.result.error}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Show context info if available */}
                  {msg.context && (
                    <div className="mt-2 text-xs text-gray-500">
                      {msg.context}
                      {msg.mode === 'test' && (
                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Test Mode
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        
        {/* Input box - fixed at bottom */}
        <div className="border-t bg-white p-4">
          <div className="w-full max-w-xl mx-auto">
            <form onSubmit={handleSend} className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white shadow-sm">
              <input
                className="flex-1 border-none outline-none bg-transparent text-base text-black"
                type="text"
                placeholder="Ask anything about your clients, emails, or schedule..."
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading}
                className="text-blue-600 font-bold px-3 py-1 rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Thinking...
                  </>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
} 
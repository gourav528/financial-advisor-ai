'use client'
import { useState } from 'react'

export default function GoogleAuth() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const connectGoogle = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/auth/google')
      const data = await response.json()
      
      if (data.success) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        alert('Failed to start Google OAuth: ' + data.error)
      }
    } catch (error) {
      console.error('Error connecting to Google:', error)
      alert('Failed to connect to Google. Please try again.')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google/disconnect', {
        method: 'POST',
      })
      
      if (response.ok) {
        setIsConnected(false)
        alert('Google disconnected successfully')
      } else {
        throw new Error('Failed to disconnect')
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error)
      alert('Failed to disconnect Google. Please try again.')
    }
  }

  // Check for OAuth callback parameters
  const checkOAuthStatus = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const googleConnected = urlParams.get('google_connected')
    const error = urlParams.get('error')
    
    if (googleConnected === 'true') {
      setIsConnected(true)
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    
    if (error) {
      console.error('Google OAuth error:', error)
      alert(`Google connection failed: ${error}`)
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }

  // Check status on component mount
  useState(() => {
    checkOAuthStatus()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-sm font-medium">Google (Gmail & Calendar)</span>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-green-600">Connected</span>
          </div>
        )}
      </div>
      
      {!isConnected ? (
        <button
          onClick={connectGoogle}
          disabled={isConnecting}
          className="w-full px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Connect Google
            </>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <button
            onClick={disconnectGoogle}
            className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Disconnect Google
          </button>
          <div className="text-xs text-gray-500">
            ✓ Gmail access enabled<br />
            ✓ Calendar access enabled<br />
            ✓ Can search emails<br />
            ✓ Can send emails<br />
            ✓ Can manage calendar events
          </div>
        </div>
      )}
    </div>
  )
} 
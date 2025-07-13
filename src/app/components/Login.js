'use client'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Login() {
  const { data: session } = useSession()

  if (session) {
    return (
      <div className="flex flex-col items-center gap-3">
        <p className="text-lg font-medium">Hello, {session.user.name}</p>
        <button
          onClick={() => signOut()}
          className="w-full py-2 px-4 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('google')}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-md border border-gray-200 shadow-sm bg-white hover:bg-gray-50 font-medium text-gray-700 text-base transition"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g clipPath="url(#clip0_17_40)">
          <path d="M23.766 12.276c0-.818-.074-1.604-.213-2.356H12.24v4.482h6.48a5.548 5.548 0 0 1-2.406 3.642v3.02h3.89c2.28-2.1 3.562-5.194 3.562-8.788z" fill="#4285F4"/>
          <path d="M12.24 24c3.24 0 5.963-1.07 7.95-2.91l-3.89-3.02c-1.08.726-2.46 1.16-4.06 1.16-3.12 0-5.76-2.104-6.7-4.932H1.54v3.09A11.997 11.997 0 0 0 12.24 24z" fill="#34A853"/>
          <path d="M5.54 14.298a7.19 7.19 0 0 1 0-4.596V6.612H1.54a12.002 12.002 0 0 0 0 10.776l4-3.09z" fill="#FBBC05"/>
          <path d="M12.24 4.78c1.764 0 3.34.606 4.584 1.796l3.43-3.43C18.2 1.07 15.48 0 12.24 0A11.997 11.997 0 0 0 1.54 6.612l4 3.09c.94-2.828 3.58-4.922 6.7-4.922z" fill="#EA4335"/>
        </g>
        <defs>
          <clipPath id="clip0_17_40">
            <path fill="#fff" d="M0 0h24v24H0z"/>
          </clipPath>
        </defs>
      </svg>
      Continue with Google
    </button>
  )
}
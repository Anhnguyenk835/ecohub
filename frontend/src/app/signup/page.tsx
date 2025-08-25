"use client"

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setMessage(null)
          setError(null)
          setIsLoading(true)
          try {
            await signUp(email, password)
            setMessage('Account created. Please check your email to verify your account before signing in.')
            toast('Sign up successful! Check your email for verification.', { duration: 4000 })
          } catch (err: any) {
            setError(err?.message || 'Failed to sign up')
          } finally {
            setIsLoading(false)
          }
        }}
      >
        <h1 className="text-xl font-semibold">Sign Up</h1>
        <input
          type="email"
          placeholder="Email"
          className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
        {message && <div className="text-sm text-green-600">{message}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full h-12 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            "Create account"
          )}
        </button>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:text-green-700 font-semibold">Sign in</Link>
        </div>
      </form>
    </div>
  )
}


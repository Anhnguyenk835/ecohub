'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getIdToken, observeAuthState, logout as fbLogout, signInWithEmail, signUpWithEmail } from '@/lib/firebase-auth'
import { post } from '@/lib/api'
import { auth } from '@/lib/firebase';

type AuthUser = {
  uid: string
  email: string | null
  displayName: string | null
  emailVerified: boolean
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  getToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = observeAuthState(async (fbUser) => {
      if (fbUser) {
        setUser({
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          emailVerified: !!fbUser.emailVerified,
        })
        try { sessionStorage.setItem('uid', fbUser.uid) } catch {}
        if (fbUser.emailVerified) {
          // Best effort profile sync; ignore errors
          try {
            await post('/users/me/sync', {})
          } catch (_) {}
        }
      } else {
        setUser(null)
        try { sessionStorage.removeItem('uid') } catch {}
      }
      setIsLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmail(email, password)
    // Sync profile after sign-in if verified; if not verified, backend will 403
    try {
      await post('/users/me/sync', {})
    } catch (_) {}
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    await signUpWithEmail(email, password)
  }, [])

  const signOut = useCallback(async () => {
    await fbLogout()
  }, [])

  const getToken = useCallback(async () => {
    return await getIdToken()
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
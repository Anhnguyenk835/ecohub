"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login')
      } else if (!user.emailVerified) {
        router.replace('/login')
      }
    }
  }, [user, isLoading, router])

  if (isLoading || !user || !user.emailVerified) {
    return <div className="p-6">Loading...</div>
  }

  return <>{children}</>
}


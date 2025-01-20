'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        // This is a placeholder. You'll need to implement a proper 
        // authentication check on the backend
        await authService.getCurrentUser()
        router.push('/dashboard')
      } catch (error) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Finance Tracker</h1>
        <p className="mt-4">Loading...</p>
      </div>
    </div>
  )
}
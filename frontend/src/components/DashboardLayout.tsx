'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/api'
import toast from 'react-hot-toast'

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Transactions', href: '/transactions', icon: '💸' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Profile', href: '/profile', icon: '👤' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authService.logout()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 transform 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 
        bg-white shadow-lg transition-transform duration-300 ease-in-out
      `}>
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-2xl font-bold text-blue-600">Finance Tracker</h1>
          <button 
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ✕
          </button>
        </div>
        <nav className="p-4">
          {navigationItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              className="flex items-center p-3 hover:bg-blue-50 rounded-lg transition"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
            </Link>
          ))}
          <button 
            onClick={handleLogout}
            className="w-full text-left flex items-center p-3 hover:bg-red-50 rounded-lg transition text-red-600"
          >
            <span className="mr-3">🚪</span>
            Logout
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white shadow-md p-4 flex items-center justify-between">
          <button onClick={() => setIsMobileMenuOpen(true)}>
            ☰
          </button>
          <h1 className="text-xl font-bold text-blue-600">Finance Tracker</h1>
        </header>

        {/* Content */}
        <main className="p-6 max-w-4xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
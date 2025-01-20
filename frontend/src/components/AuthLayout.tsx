import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
  theme?: 'blue' | 'green'
  title: string
  subtitle: string
}

export default function AuthLayout({ 
  children, 
  theme = 'blue', 
  title, 
  subtitle 
}: AuthLayoutProps) {
  const themeColors = {
    blue: {
      bg: 'from-blue-100 to-blue-300',
      header: 'bg-blue-600',
      headerText: 'text-blue-100',
      accent: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
    },
    green: {
      bg: 'from-green-100 to-green-300',
      header: 'bg-green-600',
      headerText: 'text-green-100',
      accent: 'text-green-600',
      button: 'bg-green-600 hover:bg-green-700',
    }
  }

  const colors = themeColors[theme]

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${colors.bg} p-4`}>
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className={`${colors.header} text-white text-center py-6`}>
          <h2 className="text-3xl font-bold">{title}</h2>
          <p className={`mt-2 ${colors.headerText}`}>{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
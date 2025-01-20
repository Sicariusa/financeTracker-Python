'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authService, analyticsService, transactionService } from '@/lib/api'
import toast from 'react-hot-toast'

// Icons for better visual representation
const icons = {
  income: '💰',
  expenses: '💸',
  balance: '📊',
  trend: '📈'
}

export default function DashboardPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const user = await authService.getCurrentUser()
        const analyticsData = await analyticsService.getSummary()
        const transactionsData = await transactionService.getTransactions()

        setUserData(user)
        setAnalytics(analyticsData)
        setTransactions(transactionsData)
      } catch (error) {
        toast.error('Failed to load dashboard data')
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl">🌀</div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Ensure we have data before rendering
  if (!userData || !analytics) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {userData.username}! 👋
          </h1>
          <p className="text-gray-600">Here's an overview of your financial health</p>
        </header>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: 'Total Balance', 
              value: analytics.total_balance || 0, 
              icon: icons.balance,
              color: 'bg-blue-100 text-blue-600' 
            },
            { 
              label: 'Total Income', 
              value: analytics.total_income || 0, 
              icon: icons.income,
              color: 'bg-green-100 text-green-600' 
            },
            { 
              label: 'Total Expenses', 
              value: analytics.total_expenses || 0, 
              icon: icons.expenses,
              color: 'bg-red-100 text-red-600' 
            },
            { 
              label: 'Net Trend', 
              value: (analytics.total_income - analytics.total_expenses) || 0, 
              icon: icons.trend,
              color: 'bg-purple-100 text-purple-600' 
            }
          ].map((card, index) => (
            <div 
              key={index} 
              className={`${card.color} p-6 rounded-2xl shadow-md flex items-center justify-between`}
            >
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider mb-2">
                  {card.label}
                </h3>
                <p className="text-2xl font-bold">
                  ${card.value.toFixed(2)}
                </p>
              </div>
              <span className="text-4xl">{card.icon}</span>
            </div>
          ))}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Recent Transactions</h2>
            <button 
              className="text-blue-600 hover:underline"
              onClick={() => router.push('/transactions')}
            >
              View All
            </button>
          </div>
          
          {transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No transactions yet. Start tracking your finances!</p>
              <button 
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                onClick={() => router.push('/transactions/add')}
              >
                Add First Transaction
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3 text-left">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">{transaction.description}</td>
                      <td className={`p-3 text-right font-semibold ${
                        transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${transaction.amount.toFixed(2)}
                      </td>
                      <td className="p-3 text-gray-600">{transaction.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
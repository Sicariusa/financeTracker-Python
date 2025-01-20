'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

import { loginSchema, LoginSchema } from '@/lib/validation'
import { authService } from '@/lib/api'
import AuthLayout from '@/components/AuthLayout'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema)
  })

  const onSubmit = async (data: LoginSchema) => {
    setIsLoading(true)
    try {
      await authService.login(data.email, data.password)
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      theme="blue"
      title="Finance Tracker" 
      subtitle="Manage your finances with ease"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
        <div>
          <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">Email</label>
          <input 
            type="email" 
            {...register('email')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your email"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">
              {errors.email.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="password" className="block text-gray-700 font-semibold mb-2">Password</label>
          <input 
            type="password" 
            {...register('password')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your password"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
        <div className="text-center">
          <p className="text-gray-600">
            Don't have an account? {' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
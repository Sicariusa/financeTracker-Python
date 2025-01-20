'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

import { registerSchema, RegisterSchema } from '@/lib/validation'
import { authService } from '@/lib/api'
import AuthLayout from '@/components/AuthLayout'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<RegisterSchema>({
    resolver: zodResolver(registerSchema)
  })

  const onSubmit = async (data: RegisterSchema) => {
    setIsLoading(true)
    try {
      await authService.register(data.username, data.email, data.password)
      toast.success('Registration successful! Please log in.')
      router.push('/login')
    } catch (error) {
      toast.error('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout 
      theme="green"
      title="Create Account" 
      subtitle="Start tracking your finances"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
        <div>
          <label htmlFor="username" className="block text-gray-700 font-semibold mb-2">Username</label>
          <input 
            type="text" 
            {...register('username')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Choose a username"
          />
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">
              {errors.username.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">Email</label>
          <input 
            type="email" 
            {...register('email')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Choose a password"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-gray-700 font-semibold mb-2">Confirm Password</label>
          <input 
            type="password" 
            {...register('confirmPassword')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
        <div className="text-center">
          <p className="text-gray-600">
            Already have an account? {' '}
            <Link href="/login" className="text-green-600 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
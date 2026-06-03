import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/auth.store'
import { api } from '../../lib/api'
import { toast } from 'sonner'
import { getErrorMessage } from '../../lib/errors'

const loginSchema = z.object({
  email: z.string().email('Noto\'g\'ri email'),
  password: z.string().min(1, 'Parol kiritilmagan'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setToken, setUser, setMustChangePassword } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const res = await api.post('/admin/auth/login', data)
      const { accessToken, user, mustChangePassword } = res.data.data

      setToken(accessToken)
      setUser(user)
      setMustChangePassword(mustChangePassword)

      if (mustChangePassword) {
        navigate({ to: '/change-password' })
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch (error: any) {
      toast.error(error.friendlyMessage || getErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          🌸 Mira Admin
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Tizimga kirish
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1">
                <input
                  {...register('email')}
                  type="email"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Parol</label>
              <div className="mt-1">
                <input
                  {...register('password')}
                  type="password"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${errors.password ? 'border-red-300' : 'border-gray-300'}`}
                />
                {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
              >
                {isLoading ? 'Yuklanmoqda...' : 'Kirish'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

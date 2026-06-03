import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { getErrorMessage } from '../../lib/errors'

const loginSchema = z.object({
  email:    z.string().email('Noto\'g\'ri email format'),
  password: z.string().min(1, 'Parol kiritilmagan'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  
  const { register, handleSubmit,
          formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })
  
  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await api.post('/admin/auth/login', data)
      const { accessToken, user } = res.data.data
      
      setToken(accessToken)
      setUser(user)
      
      if (user.mustChangePassword) {
        navigate({ to: '/change-password' })
      } else {
        navigate({ to: '/dashboard' })
      }
      
      toast.success(`Xush kelibsiz, ${user.fullName}!`)
      
    } catch (err: any) {
      const msg = getErrorMessage(
        err?.code ?? err?.response?.data?.error?.code ?? ''
      )
      toast.error(msg || 'Kirish muvaffaqiyatsiz')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center
                    justify-center p-4">
      <div className="w-full max-w-sm">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center
                          w-12 h-12 rounded-xl bg-primary
                          text-white text-xl mb-3">
            🌸
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Mira Admin
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Boshqaruv paneliga kirish
          </p>
        </div>
        
        {/* Form */}
        <div className="bg-white rounded-xl border-[0.5px]
                        border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)}
                className="space-y-4">
            
            <div>
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@miracosmetics.uz"
                className="mt-1 w-full h-9 px-3 rounded-lg
                           border-[0.5px] border-border text-sm
                           focus:outline-none focus:ring-2
                           focus:ring-primary/20 focus:border-primary"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">
                Parol
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="mt-1 w-full h-9 px-3 rounded-lg
                           border-[0.5px] border-border text-sm
                           focus:outline-none focus:ring-2
                           focus:ring-primary/20 focus:border-primary"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 bg-primary text-white
                         rounded-lg text-sm font-medium
                         hover:bg-primary/90 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Kirilmoqda...' : 'Kirish'}
            </button>
            
          </form>
        </div>
        
        {/* Credentials hint (dev only) */}
        {import.meta.env.DEV && (
          <p className="text-center text-xs text-gray-400 mt-4">
            admin@miracosmetics.uz / MiraAdmin2026!
          </p>
        )}
        
      </div>
    </div>
  )
}

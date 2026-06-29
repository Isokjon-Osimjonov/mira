import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import { useAuthStore, authChannel } from '../../stores/auth.store'
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
  const [lockedUntil, setLockedUntil] = useState<Date | null>(() => {
    const stored = sessionStorage.getItem('admin_lock_until')
    if (!stored) return null
    const date = new Date(stored)
    if (date <= new Date()) {
      sessionStorage.removeItem('admin_lock_until')
      return null
    }
    return date
  })
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const stored = sessionStorage.getItem('admin_lock_until')
    if (!stored) return 0
    const date = new Date(stored)
    const remaining = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000))
    return remaining
  })
  
  const { register, handleSubmit,
          formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: import.meta.env.DEV ? 'admin@miracosmetics.uz' : '',
      password: import.meta.env.DEV ? 'MiraAdmin2026!' : '',
    }
  })

  useEffect(() => {
    if (!lockedUntil) return
    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
      )
      setRemainingSeconds(remaining)
      if (remaining === 0) {
        setLockedUntil(null)
        sessionStorage.removeItem('admin_lock_until')
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  const setLocked = (until: Date) => {
    sessionStorage.setItem('admin_lock_until', until.toISOString())
    setLockedUntil(until)
  }
  
  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const res = await api.post('/admin/auth/login', data)
      const { accessToken, user } = res.data.data
      
      setToken(accessToken)
      setUser(user)
      
      // Notify other tabs
      authChannel?.postMessage('LOGIN')
      
      if (user.mustChangePassword) {
        navigate({ to: '/change-password' })
      } else {
        navigate({ to: '/dashboard' })
      }
      
      toast.success(`Xush kelibsiz, ${user.fullName}!`)
      
    } catch (err: any) {
      const code = err?.code ?? err?.response?.data?.error?.code
      
      if (code === 'ACCOUNT_LOCKED') {
        const msg = err?.response?.data?.error?.message ?? ''
        const mins = parseInt(msg.match(/(\d+) daqiqa/)?.[1] ?? '30')
        
        const newUntil = new Date(Date.now() + mins * 60 * 1000)
        const currentUntil = lockedUntil
        
        if (!currentUntil || newUntil < currentUntil) {
          setLocked(newUntil)
        }
      } else {
        const msg = getErrorMessage(code || '')
        toast.error(msg || 'Kirish muvaffaqiyatsiz')
      }
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
            
            {lockedUntil && (
              <div className="rounded-lg bg-red-50 border-[0.5px]
                              border-red-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 text-red-500">🔒</span>
                  <div>
                    <p className="text-sm font-medium text-red-700">
                      Akkaunt vaqtincha bloklangan
                    </p>
                    <p className="text-xs text-red-500 mt-0.5">
                      {Math.floor(remainingSeconds / 60)}:{
                        (remainingSeconds % 60).toString().padStart(2, '0')
                      } dan keyin urinib ko'ring
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="admin@miracosmetics.uz"
                disabled={!!lockedUntil}
                className="mt-1 w-full h-9 px-3 rounded-lg
                           border-[0.5px] border-border text-sm
                           focus:outline-none focus:ring-2
                           focus:ring-primary/20 focus:border-primary disabled:opacity-50"
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
                disabled={!!lockedUntil}
                className="mt-1 w-full h-9 px-3 rounded-lg
                           border-[0.5px] border-border text-sm
                           focus:outline-none focus:ring-2
                           focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || !!lockedUntil}
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

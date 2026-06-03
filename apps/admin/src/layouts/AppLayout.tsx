import { useEffect } from 'react'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { connectSocket, disconnectSocket } from '../lib/socket'
import { useAuthStore } from '../stores/auth.store'
import { navItems } from './nav-items'

export function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    connectSocket()
    return () => {
      disconnectSocket()
    }
  }, [])

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col">
        {/* Header */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="text-xl font-bold text-primary">🌸 Mira Admin</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((group, idx) => (
            <div key={idx} className="mb-6 px-4">
              {group.group && (
                <h3 className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.group}
                </h3>
              )}
              <div className="space-y-1">
                {group.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
                    className="w-full flex items-center gap-3 px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
                    onClick={() => navigate({ to: item.url })}
                  >
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border bg-gray-50">
          <div className="text-xs text-gray-500 mb-4 text-center">
            Valyuta: 1 ₩ = 12 so'm
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              {user?.fullName?.[0] ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.fullName ?? 'Admin'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role?.name ?? (user?.isSuperAdmin ? 'Super Admin' : 'Admin')}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 w-full py-2 px-4 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
          >
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

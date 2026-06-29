import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { AppSidebar } from '../components/app-sidebar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import { connectSocket, disconnectSocket } from '../lib/socket'

import { NotificationBell } from '../components/NotificationBell'
import { GlobalSearch } from '../components/GlobalSearch'

// Page title mapping
const PAGE_TITLES: Record<string, { parent?: string; title: string }> = {
  '/dashboard': { title: 'Dashboard' },
  '/orders': { parent: 'Savdo', title: 'Buyurtmalar' },
  '/customers': { parent: 'Savdo', title: 'Mijozlar' },
  '/coupons': { parent: 'Savdo', title: 'Kuponlar' },
  '/products': { parent: 'Mahsulotlar', title: 'Mahsulotlar' },
  '/categories': { parent: 'Mahsulotlar', title: 'Kategoriyalar' },
  '/inventory': { parent: 'Mahsulotlar', title: 'Inventar' },
  '/suppliers': { parent: 'Mahsulotlar', title: 'Yetkazuvchilar' },
  '/purchase-orders': { parent: 'Mahsulotlar', title: 'Buyurtma berish' },
  '/expenses': { parent: 'Moliya', title: 'Xarajatlar' },
  '/analytics': { parent: 'Moliya', title: 'Analitika' },
  '/reports': { parent: 'Moliya', title: 'Hisobotlar' },
  '/telegram': { parent: 'Marketing', title: 'Telegram' },
  '/banners': { parent: 'Marketing', title: 'Bannerlar' },
  '/settings': { parent: 'Tizim', title: 'Sozlamalar' },
  '/exchange-rates': { parent: 'Tizim', title: 'Valyuta kursi' },
  '/admin-users': { parent: 'Tizim', title: 'Adminlar' },
  '/roles': { parent: 'Tizim', title: 'Rollar' },
  '/audit': { parent: 'Tizim', title: 'Audit log' },
  '/system': { parent: 'Tizim', title: 'Tizim holati' },
  '/profile': { title: 'Profil' },
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  // Socket connection
  useEffect(() => {
    connectSocket()
    return () => disconnectSocket()
  }, [])

  // Session validation (once on mount)
  useEffect(() => {
    let cancelled = false
    api
      .get('/admin/auth/me')
      .then((res) => {
        if (!cancelled) useAuthStore.getState().setUser(res.data.data)
      })
      .catch((_err) => {
        // Errors are handled by the central api.ts interceptors
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Get current page info
  const basePath = '/' + location.pathname.split('/')[1]
  const pageInfo = PAGE_TITLES[basePath] ?? { title: 'Sahifa' }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header
          className="flex h-14 shrink-0 items-center justify-between gap-2
                            border-b border-border/50 bg-white
                            px-4 sticky top-0 z-10"
        >
          <div className="flex items-center gap-2">
            <SidebarTrigger
              className="-ml-1 text-muted-foreground
                                       hover:text-foreground"
            />
            <Separator orientation="vertical" className="h-4 mx-1" />
            <Breadcrumb>
              <BreadcrumbList>
                {pageInfo.parent && (
                  <>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink
                        className="text-muted-foreground
                                                 text-sm"
                      >
                        {pageInfo.parent}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                  </>
                )}
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-medium">{pageInfo.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-2">
            <GlobalSearch />
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <div
          className="flex flex-col flex-1 gap-4 p-4 md:p-6
                        bg-gray-50 min-h-0"
        >
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

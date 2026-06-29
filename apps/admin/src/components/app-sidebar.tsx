import { Link } from '@tanstack/react-router'
import {
  BarChart2,
  ShoppingBag,
  Users,
  Tag,
  Package,
  Layers,
  Boxes,
  Box,
  Building2,
  ClipboardList,
  Receipt,
  TrendingUp,
  FileSpreadsheet,
  Image as ImageIcon,
  Send,
  Settings2,
  Shield,
  Lock,
  FileText,
  Activity,
  ExternalLink,
} from 'lucide-react'
import { NavMain } from './nav-main'
import { NavUser } from './nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useAuthStore } from '../stores/auth.store'
import { useExchangeRate } from '../hooks/useExchangeRate'

const navMain: {
  title: string
  items: { title: string; url: string; icon: any; resource?: string }[]
}[] = [
  {
    title: 'Umumiy',
    items: [{ title: 'Dashboard', url: '/dashboard', icon: BarChart2 }],
  },
  {
    title: 'Savdo',
    items: [
      { title: 'Buyurtmalar', url: '/orders', icon: ShoppingBag, resource: 'orders' },
      { title: 'Mijozlar', url: '/customers', icon: Users, resource: 'customers' },
      { title: 'Kuponlar', url: '/coupons', icon: Tag, resource: 'coupons' },
    ],
  },
  {
    title: 'Mahsulotlar',
    items: [
      { title: 'Mahsulotlar', url: '/products', icon: Package, resource: 'products' },
      { title: 'Kategoriyalar', url: '/categories', icon: Layers, resource: 'products' }, // assuming products resource covers categories
      { title: 'Inventar', url: '/inventory', icon: Boxes, resource: 'inventory' },
      { title: 'Qutular', url: '/boxes', icon: Box, resource: 'products' },
      { title: 'Yetkazuvchilar', url: '/suppliers', icon: Building2, resource: 'products' },
      { title: 'Yuk sanalari', url: '/cargo-dates', icon: Package, resource: 'products' },
      {
        title: 'Buyurtma berish',
        url: '/purchase-orders',
        icon: ClipboardList,
        resource: 'inventory',
      },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { title: 'Xarajatlar', url: '/expenses', icon: Receipt, resource: 'expenses' },
      { title: 'Analitika', url: '/analytics', icon: TrendingUp, resource: 'analytics' },
      { title: 'Hisobotlar', url: '/reports', icon: FileSpreadsheet, resource: 'analytics' },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { title: 'Telegram', url: '/telegram', icon: Send, resource: 'telegram' },
      { title: 'Bannerlar', url: '/banners', icon: ImageIcon, resource: 'settings' },
    ],
  },
  {
    title: 'Tizim',
    items: [
      { title: 'Sozlamalar', url: '/settings', icon: Settings2, resource: 'settings' },
      { title: 'Tizim holati', url: '/system', icon: Activity, resource: 'settings' },
      { title: 'Adminlar', url: '/admin-users', icon: Shield, resource: 'users' },
      { title: 'Rollar', url: '/roles', icon: Lock, resource: 'roles' },
      { title: 'Audit log', url: '/audit', icon: FileText, resource: 'settings' },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useAuthStore((s) => s.user)
  const { rate } = useExchangeRate()

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      {/* Header: Mira Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ShoppingBag className="size-4" strokeWidth={2.5} />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-bold">Mira Admin</span>
                  <span className="truncate text-[10px] text-muted-foreground uppercase tracking-wider">
                    Cosmetics
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navMain.map((group) => {
          const filteredItems = group.items.filter(
            (item) => !item.resource || useAuthStore.getState().canView(item.resource as string)
          )
          if (filteredItems.length === 0) return null
          return <NavMain key={group.title} label={group.title} items={filteredItems} />
        })}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 mb-2 bg-gray-50/50 rounded-xl border-[0.5px] border-border/50 mx-2 group-data-[collapsible=icon]:hidden">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
            Valyuta kursi
          </p>
          <p className="text-sm font-bold text-gray-900">1 ₩ = {rate} so'm</p>
        </div>

        {user && (
          <NavUser
            user={{
              name: user.fullName,
              email: user.email,
              role: user.isSuperAdmin ? 'Super Admin' : 'Admin',
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

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
  Send,
  Settings2,
  Coins,
  Shield,
  Lock,
  Flower2,
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

const navMain = [
  {
    title: 'Umumiy',
    items: [{ title: 'Dashboard', url: '/dashboard', icon: BarChart2 }],
  },
  {
    title: 'Savdo',
    items: [
      { title: 'Buyurtmalar', url: '/orders', icon: ShoppingBag, permission: 'orders:read' },
      { title: 'Mijozlar', url: '/customers', icon: Users, permission: 'customers:read' },
      { title: 'Kuponlar', url: '/coupons', icon: Tag, permission: 'coupons:read' },
    ],
  },
  {
    title: 'Mahsulotlar',
    items: [
      { title: 'Mahsulotlar', url: '/products', icon: Package },
      { title: 'Kategoriyalar', url: '/categories', icon: Layers },
      { title: 'Inventar', url: '/inventory', icon: Boxes },
      { title: 'Qutular', url: '/boxes', icon: Box },
      { title: 'Yetkazuvchilar', url: '/suppliers', icon: Building2 },
      { title: 'Buyurtma berish', url: '/purchase-orders', icon: ClipboardList },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { title: 'Xarajatlar', url: '/expenses', icon: Receipt },
      { title: 'Analitika', url: '/analytics', icon: TrendingUp },
      { title: 'Hisobotlar', url: '/reports', icon: FileSpreadsheet },
    ],
  },
  {
    title: 'Marketing',
    items: [{ title: 'Telegram', url: '/telegram', icon: Send }],
  },
  {
    title: 'Tizim',
    items: [
      { title: 'Sozlamalar', url: '/settings', icon: Settings2 },
      { title: 'Valyuta kursi', url: '/exchange-rates', icon: Coins },
      { title: 'Adminlar', url: '/admin-users', icon: Shield, superAdminOnly: true },
      { title: 'Rollar', url: '/roles', icon: Lock, superAdminOnly: true },
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
                <div
                  className="flex aspect-square size-8 items-center
                                justify-center rounded-lg bg-primary
                                text-white"
                >
                  <Flower2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-900">Mira Admin</span>
                  <span className="truncate text-xs text-muted-foreground">miracosmetics.uz</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content: Nav groups */}
      <SidebarContent>
        {navMain.map((group) => (
          <NavMain key={group.title} label={group.title} items={group.items} />
        ))}
      </SidebarContent>

      {/* Footer: Exchange rate + User */}
      <SidebarFooter>
        {/* Exchange rate */}
        {rate && (
          <div className="px-3 py-1 group-data-[collapsible=icon]:hidden">
            <p className="text-[11px] text-muted-foreground">Valyuta: 1 ₩ = {rate} so'm</p>
          </div>
        )}
        {user && (
          <NavUser
            user={{
              name: user.fullName,
              email: user.email,
              role: user.isSuperAdmin ? 'Super Admin' : (user.role?.name ?? 'Admin'),
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

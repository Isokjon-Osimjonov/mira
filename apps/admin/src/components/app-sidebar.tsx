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
      { title: 'Tizim holati', url: '/system', icon: Activity, superAdminOnly: true },
      { title: 'Adminlar', url: '/admin-users', icon: Shield, superAdminOnly: true },
      { title: 'Rollar', url: '/roles', icon: Lock, superAdminOnly: true },
      { title: 'Audit log', url: '/audit', icon: FileText, superAdminOnly: true },
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
        {navMain.map((group) => (
          <NavMain key={group.title} label={group.title} items={group.items} />
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 mb-2 bg-gray-50/50 rounded-xl border-[0.5px] border-border/50 mx-2">
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
              role: user.isSuperAdmin ? 'Super Admin' : (user.role?.name ?? 'Admin'),
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}

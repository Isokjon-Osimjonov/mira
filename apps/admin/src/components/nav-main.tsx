import { Link, useLocation } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  badge?: number
  external?: boolean
}

export function NavMain({ label, items }: { label: string; items: NavItem[] }) {
  const location = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive =
            location.pathname === item.url || location.pathname.startsWith(item.url + '/')

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isActive}
                className={isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}
              >
                {item.external ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
                    <span>{item.title}</span>
                  </a>
                ) : (
                  <Link to={item.url}>
                    <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
                    <span>{item.title}</span>
                    {item.badge && item.badge > 0 && (
                      <span
                        className="ml-auto flex h-5 w-5 items-center
                                       justify-center rounded-full bg-primary
                                       text-[10px] font-medium text-white"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

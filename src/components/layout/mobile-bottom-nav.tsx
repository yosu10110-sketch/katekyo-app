'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users, Calendar, MessageSquare, MessageCircle,
  LayoutDashboard, ClipboardList, BarChart3, Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'
import dynamic from 'next/dynamic'

const ChatNotificationBadge = dynamic(
  () => import('@/components/chat/chat-notification-badge').then(m => m.ChatNotificationBadge),
  { ssr: false }
)
const NavBadge = dynamic(
  () => import('@/components/layout/nav-badge').then(m => m.NavBadge),
  { ssr: false }
)

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: '生徒', icon: Users, roles: ['teacher'] },
  { href: '/lectures', label: '講義', icon: Calendar, roles: ['teacher'] },
  { href: '/billing', label: '月謝', icon: Receipt, roles: ['teacher'] },
  { href: '/notice-board', label: '連絡板', icon: MessageSquare, roles: ['teacher'] },
  { href: '/chat', label: 'チャット', icon: MessageCircle, roles: ['teacher'] },

  { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard, roles: ['student'] },
  { href: '/assignments', label: '課題', icon: ClipboardList, roles: ['student'] },
  { href: '/lectures', label: '講義', icon: Calendar, roles: ['student'] },
  { href: '/curriculum', label: '教材', icon: BarChart3, roles: ['student'] },
  { href: '/chat', label: 'チャット', icon: MessageCircle, roles: ['student'] },

  { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard, roles: ['parent'] },
  { href: '/billing', label: '月謝', icon: Receipt, roles: ['parent'] },
  { href: '/lectures', label: '講義', icon: Calendar, roles: ['parent'] },
  { href: '/notice-board', label: '連絡板', icon: MessageSquare, roles: ['parent'] },
  { href: '/chat', label: 'チャット', icon: MessageCircle, roles: ['parent'] },
]

interface MobileBottomNavProps {
  role: UserRole
  userId: string
}

export function MobileBottomNav({ role, userId }: MobileBottomNavProps) {
  const pathname = usePathname()
  const filtered = navItems.filter((item) => item.roles.includes(role))

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex items-stretch h-16 safe-area-pb">
      {filtered.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors',
              isActive ? 'text-indigo-600' : 'text-gray-400'
            )}
          >
            <div className="relative">
              <item.icon className="h-5 w-5" />
              {item.href === '/chat' && (
                <span className="absolute -top-1 -right-1">
                  <ChatNotificationBadge userId={userId} />
                </span>
              )}
              {(item.href === '/assignments' || item.href === '/notice-board' || item.href === '/lectures') && (
                <span className="absolute -top-1 -right-1">
                  <NavBadge
                    userId={userId}
                    role={role}
                    feature={item.href.replace('/', '') as 'assignments' | 'notice-board' | 'lectures'}
                  />
                </span>
              )}
            </div>
            <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-normal')}>
              {item.label}
            </span>
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ClipboardList,
  Calendar,
  MessageSquare,
  MessageCircle,
  LayoutDashboard,
  Users,
  Receipt,
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

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  // 謨吝ｸｫ
  {
    href: '/dashboard',
    label: '逕溷ｾ剃ｸ隕ｧ',
    icon: Users,
    roles: ['teacher'],
  },
  {
    href: '/lectures',
    label: '谺｡蝗櫁ｬ帷ｾｩ',
    icon: Calendar,
    roles: ['teacher'],
  },
  {
    href: '/notice-board',
    label: '騾｣邨｡譚ｿ',
    icon: MessageSquare,
    roles: ['teacher'],
  },
  {
    href: '/billing',
    label: '譛郁ｬ晉ｮ｡逅・,
    icon: Receipt,
    roles: ['teacher'],
  },
  {
    href: '/chat',
    label: '繝√Ε繝・ヨ',
    icon: MessageCircle,
    roles: ['teacher'],
  },
  // 逕溷ｾ抵ｼ・鬆・岼縺ｮ縺ｿ・・  {
    href: '/assignments',
    label: '隱ｲ鬘・,
    icon: ClipboardList,
    roles: ['student'],
  },
  {
    href: '/lectures',
    label: '谺｡蝗櫁ｬ帷ｾｩ',
    icon: Calendar,
    roles: ['student'],
  },
  {
    href: '/chat',
    label: '繝√Ε繝・ヨ',
    icon: MessageCircle,
    roles: ['student'],
  },
  {
    href: '/notice-board',
    label: '騾｣邨｡譚ｿ',
    icon: MessageSquare,
    roles: ['student'],
  },
  // 菫晁ｭｷ閠・  {
    href: '/dashboard',
    label: '繝繝・す繝･繝懊・繝・,
    icon: LayoutDashboard,
    roles: ['parent'],
  },
  {
    href: '/relationships',
    label: '縺雁ｭ舌＆繧鍋ｮ｡逅・,
    icon: Users,
    roles: ['parent'],
  },
  {
    href: '/assignments',
    label: '隱ｲ鬘檎｢ｺ隱・,
    icon: ClipboardList,
    roles: ['parent'],
  },
  {
    href: '/lectures',
    label: '谺｡蝗櫁ｬ帷ｾｩ',
    icon: Calendar,
    roles: ['parent'],
  },
  {
    href: '/notice-board',
    label: '騾｣邨｡譚ｿ',
    icon: MessageSquare,
    roles: ['parent'],
  },
  {
    href: '/billing',
    label: '譛郁ｬ晉｢ｺ隱・,
    icon: Receipt,
    roles: ['parent'],
  },
  {
    href: '/chat',
    label: '繝√Ε繝・ヨ',
    icon: MessageCircle,
    roles: ['parent'],
  },
]

interface SidebarProps {
  role: UserRole
  userId: string
}

export function Sidebar({ role, userId }: SidebarProps) {
  const pathname = usePathname()
  const filtered = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-white border-r border-gray-200 flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-200">
        <div className="bg-indigo-600 p-1.5 rounded-lg">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-sm">繧ｫ繝・く繝ｧ繧ｵ繝昴・繝・/span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {filtered.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-indigo-600' : 'text-gray-400')} />
              {item.label}
              {item.href === '/chat' && <ChatNotificationBadge userId={userId} />}
              {item.href === '/assignments' && <NavBadge userId={userId} role={role} feature="assignments" />}
              {item.href === '/notice-board' && <NavBadge userId={userId} role={role} feature="notice-board" />}
              {item.href === '/lectures' && <NavBadge userId={userId} role={role} feature="lectures" />}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-3 border-t border-gray-200">
        <div className="px-3 py-1.5">
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            role === 'teacher' ? 'bg-indigo-100 text-indigo-700' :
            role === 'student' ? 'bg-green-100 text-green-700' :
            'bg-amber-100 text-amber-700'
          )}>
            {role === 'teacher' ? '謨吝ｸｫ' : role === 'student' ? '逕溷ｾ・ : '菫晁ｭｷ閠・}
          </span>
        </div>
      </div>
    </aside>
  )
}

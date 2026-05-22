'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  ClipboardList,
  Calendar,
  MessageSquare,
  BarChart3,
  MessageCircle,
  LayoutDashboard,
  Users,
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
  // 教師
  {
    href: '/dashboard',
    label: '生徒一覧',
    icon: Users,
    roles: ['teacher'],
  },
  {
    href: '/lectures',
    label: '次回講義',
    icon: Calendar,
    roles: ['teacher'],
  },
  {
    href: '/notice-board',
    label: '連絡板',
    icon: MessageSquare,
    roles: ['teacher'],
  },
  {
    href: '/chat',
    label: 'チャット',
    icon: MessageCircle,
    roles: ['teacher'],
  },
  // 生徒（4項目のみ）
  {
    href: '/assignments',
    label: '課題',
    icon: ClipboardList,
    roles: ['student'],
  },
  {
    href: '/lectures',
    label: '次回講義',
    icon: Calendar,
    roles: ['student'],
  },
  {
    href: '/chat',
    label: 'チャット',
    icon: MessageCircle,
    roles: ['student'],
  },
  {
    href: '/notice-board',
    label: '連絡板',
    icon: MessageSquare,
    roles: ['student'],
  },
  // 保護者
  {
    href: '/dashboard',
    label: 'ダッシュボード',
    icon: LayoutDashboard,
    roles: ['parent'],
  },
  {
    href: '/assignments',
    label: '課題確認',
    icon: ClipboardList,
    roles: ['parent'],
  },
  {
    href: '/lectures',
    label: '次回講義',
    icon: Calendar,
    roles: ['parent'],
  },
  {
    href: '/notice-board',
    label: '連絡板',
    icon: MessageSquare,
    roles: ['parent'],
  },
  {
    href: '/chat',
    label: 'チャット',
    icon: MessageCircle,
    roles: ['parent'],
  },
  {
    href: '/relationships',
    label: 'メンバー管理',
    icon: Users,
    roles: ['student', 'parent'],
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
        <span className="font-bold text-gray-900 text-sm">カテキョサポート</span>
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
            {role === 'teacher' ? '教師' : role === 'student' ? '生徒' : '保護者'}
          </span>
        </div>
      </div>
    </aside>
  )
}

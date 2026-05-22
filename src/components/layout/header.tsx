'use client'

import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut } from 'lucide-react'
import type { Profile } from '@/types'

const pageTitles: Record<string, string> = {
  '/dashboard': 'ダッシュボード',
  '/assignments': '課題管理',
  '/lectures': '次回講義',
  '/notice-board': '連絡板',
  '/curriculum': '教材進捗',
  '/chat': 'チャット',
  '/profile': 'プロフィール',
}

function getTitle(pathname: string): string {
  for (const [key, value] of Object.entries(pageTitles)) {
    if (pathname === key || pathname.startsWith(key + '/')) return value
  }
  return 'カテキョサポート'
}

export function Header({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const title = getTitle(pathname)

  const initials = profile.full_name
    .split(/[\s　]+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2.5 hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors focus:outline-none"
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
              {initials}
            </div>
          )}
          <p className="text-sm font-medium text-gray-900 hidden sm:block">{profile.full_name}</p>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
              {profile.full_name}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logout()}
            className="flex items-center gap-2 cursor-pointer"
            variant="destructive"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

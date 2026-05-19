'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

type Feature = 'assignments' | 'notice-board' | 'lectures' | 'chat'

interface NavBadgeProps {
  userId: string
  role: string
  feature: Feature
}

const STORAGE_KEY = (feature: Feature) => `badge_last_read_${feature}`

export function NavBadge({ userId, role, feature }: NavBadgeProps) {
  const [count, setCount] = useState(0)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // 該当ページを開いている間はバッジリセット
    if (pathname.startsWith(`/${feature}`)) {
      setCount(0)
      localStorage.setItem(STORAGE_KEY(feature), new Date().toISOString())
      return
    }

    const lastRead = localStorage.getItem(STORAGE_KEY(feature)) ?? '1970-01-01'
    let unsubscribe: (() => void) | null = null

    async function loadCount() {
      let total = 0

      if (feature === 'assignments') {
        if (role === 'teacher') {
          // 教師：新しい提出物
          const { count: c } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .gt('submitted_at', lastRead)
            .in('assignment_id',
              (await supabase.from('assignments').select('id').eq('teacher_id', userId)).data?.map(a => a.id) ?? []
            )
          total = c ?? 0
        } else if (role === 'student') {
          // 生徒：新しい課題
          const { count: c } = await supabase
            .from('assignments')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', userId)
            .gt('created_at', lastRead)
          total = c ?? 0
        } else {
          // 保護者：子供への新しい課題
          const { data: rels } = await supabase
            .from('parent_student_relationships')
            .select('student_id')
            .eq('parent_id', userId)
          const ids = rels?.map(r => r.student_id) ?? []
          if (ids.length > 0) {
            const { count: c } = await supabase
              .from('assignments')
              .select('*', { count: 'exact', head: true })
              .in('student_id', ids)
              .gt('created_at', lastRead)
            total = c ?? 0
          }
        }

        // リアルタイム
        const ch = supabase.channel(`badge_assignments_${userId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public',
            table: role === 'teacher' ? 'assignment_submissions' : 'assignments' },
            () => setCount(p => p + 1))
          .subscribe()
        unsubscribe = () => supabase.removeChannel(ch)

      } else if (feature === 'notice-board') {
        // 連絡板：新しい投稿・返信
        const { count: postCount } = await supabase
          .from('notice_board_posts')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastRead)
        const { count: replyCount } = await supabase
          .from('notice_board_replies')
          .select('*', { count: 'exact', head: true })
          .gt('created_at', lastRead)
          .neq('author_id', userId)
        total = (postCount ?? 0) + (replyCount ?? 0)

        const ch = supabase.channel(`badge_noticeboard_${userId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notice_board_posts' },
            () => setCount(p => p + 1))
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notice_board_replies' },
            (payload) => {
              const r = payload.new as { author_id: string }
              if (r.author_id !== userId) setCount(p => p + 1)
            })
          .subscribe()
        unsubscribe = () => supabase.removeChannel(ch)

      } else if (feature === 'lectures') {
        if (role === 'teacher') {
          // 教師：新しい講義申請
          const { count: c } = await supabase
            .from('lecture_requests')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', userId)
            .eq('status', 'pending')
            .gt('created_at', lastRead)
          total = c ?? 0

          const ch = supabase.channel(`badge_lectures_${userId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lecture_requests' },
              () => setCount(p => p + 1))
            .subscribe()
          unsubscribe = () => supabase.removeChannel(ch)
        } else {
          // 生徒：新しい講義追加
          const { count: c } = await supabase
            .from('lectures')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', userId)
            .gt('created_at', lastRead)
          total = c ?? 0

          const ch = supabase.channel(`badge_lectures_student_${userId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lectures' },
              (payload) => {
                const l = payload.new as { student_id: string }
                if (l.student_id === userId) setCount(p => p + 1)
              })
            .subscribe()
          unsubscribe = () => supabase.removeChannel(ch)
        }
      }

      setCount(total)
    }

    loadCount()
    return () => { unsubscribe?.() }
  }, [userId, role, feature, pathname, supabase])

  if (count === 0) return null

  return (
    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 leading-5 min-w-[20px] text-center">
      {count > 99 ? '99+' : count}
    </span>
  )
}

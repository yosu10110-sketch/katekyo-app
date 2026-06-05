import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'
import { NoticeBoardClient } from '@/components/notice-board/notice-board-client'
import type { Profile, NoticeBoardPost, NoticeBoardReply } from '@/types'

type PostWithRelations = NoticeBoardPost & {
  profiles: Pick<Profile, 'full_name'>
  notice_board_replies: (NoticeBoardReply & { profiles: Pick<Profile, 'full_name'> })[]
}

export default async function NoticeBoardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')
  const { role } = profile

  const supabase = await createClient()

  let studentIds: string[] = []
  let students: Profile[] = []
  let defaultStudentId: string | undefined

  if (role === 'teacher') {
    const { data: rels } = await supabase
      .from('teacher_student_relationships')
      .select('profiles!teacher_student_relationships_student_id_fkey(*), student_id')
      .eq('teacher_id', user.id)
    students = rels?.map((r) => r.profiles as unknown as Profile).filter(Boolean) ?? []
    studentIds = rels?.map((r) => r.student_id) ?? []
  } else if (role === 'parent') {
    const { data: rels } = await supabase
      .from('parent_student_relationships')
      .select('student_id')
      .eq('parent_id', user.id)
    studentIds = rels?.map((r) => r.student_id) ?? []
    defaultStudentId = studentIds[0]
  }

  let postsQuery = supabase
    .from('notice_board_posts')
    .select(`
      *,
      profiles!notice_board_posts_author_id_fkey(full_name),
      notice_board_replies(
        *,
        profiles!notice_board_replies_author_id_fkey(full_name)
      )
    `)
    .order('created_at', { ascending: false })

  if (role === 'teacher' && studentIds.length > 0) {
    postsQuery = postsQuery.in('student_id', studentIds)
  } else if (role === 'parent' && studentIds.length > 0) {
    postsQuery = postsQuery.in('student_id', studentIds)
  } else if (role === 'student') {
    postsQuery = postsQuery
      .eq('student_id', user.id)
      .eq('is_visible_to_student', true)
  }

  const { data: posts } = await postsQuery

  return (
    <div className="space-y-6 max-w-2xl">
      <NoticeBoardClient
        initialPosts={(posts ?? []) as PostWithRelations[]}
        role={role}
        students={students}
        currentUserId={user.id}
        currentUserName={profile.full_name}
        defaultStudentId={defaultStudentId}
      />
    </div>
  )
}

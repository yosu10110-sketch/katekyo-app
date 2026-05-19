import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreatePostDialog } from '@/components/notice-board/create-post-dialog'
import { PostCard } from '@/components/notice-board/post-card'
import { MessageSquare } from 'lucide-react'
import type { Profile, NoticeBoardPost, NoticeBoardReply } from '@/types'

type PostWithRelations = NoticeBoardPost & {
  profiles: Pick<Profile, 'full_name'>
  notice_board_replies: (NoticeBoardReply & { profiles: Pick<Profile, 'full_name'> })[]
}

export default async function NoticeBoardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const { role } = profile as Profile

  // 担当生徒を取得
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

  // 投稿一覧取得（ロール別）
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {role === 'student'
            ? '教師から公開された連絡のみ表示されます'
            : `${posts?.length ?? 0}件の投稿`}
        </p>
        {(role === 'teacher' || role === 'parent') && (
          <CreatePostDialog role={role} students={students} defaultStudentId={defaultStudentId} />
        )}
      </div>

      {!posts || posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">まだ投稿はありません</p>
          {role !== 'student' && (
            <p className="text-gray-400 text-sm mt-1">「新しい投稿」から連絡を送ることができます</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {(posts as PostWithRelations[]).map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user.id}
              role={role}
            />
          ))}
        </div>
      )}
    </div>
  )
}

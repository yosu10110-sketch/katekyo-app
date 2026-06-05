'use client'

import { useOptimistic } from 'react'
import { PostCard } from './post-card'
import { CreatePostDialog } from './create-post-dialog'
import { MessageSquare } from 'lucide-react'
import type { Profile, NoticeBoardPost, NoticeBoardReply } from '@/types'

export type PostWithRelations = NoticeBoardPost & {
  profiles: Pick<Profile, 'full_name'>
  notice_board_replies: (NoticeBoardReply & { profiles: Pick<Profile, 'full_name'> })[]
}

interface NoticeBoardClientProps {
  initialPosts: PostWithRelations[]
  role: string
  students: Profile[]
  currentUserId: string
  currentUserName: string
  defaultStudentId?: string
}

export function NoticeBoardClient({
  initialPosts,
  role,
  students,
  currentUserId,
  currentUserName,
  defaultStudentId,
}: NoticeBoardClientProps) {
  const [optimisticPosts, addOptimisticPost] = useOptimistic(
    initialPosts,
    (state: PostWithRelations[], newPost: PostWithRelations) => [newPost, ...state],
  )

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {role === 'student'
            ? '教師から公開された連絡のみ表示されます'
            : `${optimisticPosts.length}件の投稿`}
        </p>
        {(role === 'teacher' || role === 'parent') && (
          <CreatePostDialog
            role={role}
            students={students}
            defaultStudentId={defaultStudentId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onCreated={addOptimisticPost}
          />
        )}
      </div>

      {optimisticPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">まだ投稿はありません</p>
          {role !== 'student' && (
            <p className="text-gray-400 text-sm mt-1">「新しい投稿」から連絡を送ることができます</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {optimisticPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              role={role}
            />
          ))}
        </div>
      )}
    </>
  )
}

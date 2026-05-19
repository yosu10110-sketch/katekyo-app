'use client'

import { useState } from 'react'
import { createReply, toggleVisibility, deletePost } from '@/app/actions/notice-board'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, Eye, EyeOff, Trash2, ChevronDown, ChevronUp, Send } from 'lucide-react'
import type { NoticeBoardPost, NoticeBoardReply, Profile } from '@/types'

interface PostCardProps {
  post: NoticeBoardPost & {
    profiles: Pick<Profile, 'full_name'>
    notice_board_replies: (NoticeBoardReply & { profiles: Pick<Profile, 'full_name'> })[]
  }
  currentUserId: string
  role: string
}

export function PostCard({ post, currentUserId, role }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(post.is_visible_to_student)

  async function handleReply() {
    if (!replyText.trim()) return
    setLoading(true)
    const fd = new FormData()
    fd.append('post_id', post.id)
    fd.append('content', replyText)
    await createReply(fd)
    setReplyText('')
    setReplying(false)
    setLoading(false)
  }

  async function handleToggleVisibility() {
    const next = !visible
    setVisible(next)
    await toggleVisibility(post.id, visible)
  }

  async function handleDelete() {
    if (!confirm('この投稿を削除しますか？')) return
    await deletePost(post.id)
  }

  const replyCount = post.notice_board_replies?.length ?? 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">{post.profiles?.full_name}</span>
              <span className="text-xs text-gray-300">
                {new Date(post.created_at).toLocaleDateString('ja-JP', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {role === 'teacher' && (
                <Badge
                  className={`text-xs cursor-pointer select-none ${visible ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}
                  onClick={handleToggleVisibility}
                >
                  {visible ? (
                    <><Eye className="h-3 w-3 mr-1 inline" />生徒に公開中</>
                  ) : (
                    <><EyeOff className="h-3 w-3 mr-1 inline" />非公開</>
                  )}
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-gray-900">{post.title}</h3>
          </div>
          {(role === 'teacher' || post.author_id === currentUserId) && (
            <button
              onClick={handleDelete}
              className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 whitespace-pre-wrap mt-2">{post.content}</p>
      </div>

      {/* 返信エリア */}
      <div className="border-t border-gray-100 bg-gray-50">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            返信 {replyCount > 0 && <span className="font-medium text-gray-700">{replyCount}件</span>}
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3">
            {replyCount > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  {post.notice_board_replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2.5">
                      <div className="w-1.5 bg-indigo-200 rounded-full shrink-0 mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-700">{reply.profiles?.full_name}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(reply.created_at).toLocaleDateString('ja-JP', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {!replying ? (
              <button
                onClick={() => setReplying(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + 返信する
              </button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="返信を入力..."
                  rows={2}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setReplying(false)}>
                    キャンセル
                  </Button>
                  <Button type="button" size="sm" onClick={handleReply} disabled={loading || !replyText.trim()} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    {loading ? '送信中...' : '返信する'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createReply, toggleVisibility, deletePost } from '@/app/actions/notice-board'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare, Eye, EyeOff, Trash2, ChevronDown, ChevronUp,
  Send, Paperclip, X, FileText,
} from 'lucide-react'
import type { NoticeBoardPost, NoticeBoardReply, Profile } from '@/types'

interface PostCardProps {
  post: NoticeBoardPost & {
    profiles: Pick<Profile, 'full_name'>
    notice_board_replies: (NoticeBoardReply & { profiles: Pick<Profile, 'full_name'> })[]
  }
  currentUserId: string
  role: string
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|heic|avif|bmp)(\?|$)/i.test(url)
}

function AttachmentViewer({ urls, small = false }: { urls: string[]; small?: boolean }) {
  if (!urls || urls.length === 0) return null
  const images = urls.filter(isImageUrl)
  const files = urls.filter((u) => !isImageUrl(u))

  return (
    <div className="space-y-2 mt-2">
      {images.length > 0 && (
        <div className={`grid gap-1.5 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img
                src={url}
                alt={`添付画像${i + 1}`}
                className={`w-full object-cover rounded-lg border border-gray-200 ${small ? 'max-h-32' : 'max-h-56'}`}
              />
            </a>
          ))}
        </div>
      )}
      {files.map((url, i) => {
        const filename = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? `ファイル${i + 1}`)
          .replace(/^\d+_/, '')
        return (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
          >
            <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="text-sm text-indigo-600 truncate">{filename}</span>
          </a>
        )
      })}
    </div>
  )
}

export function PostCard({ post, currentUserId, role }: PostCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyAttachments, setReplyAttachments] = useState<{ url: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(post.is_visible_to_student)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleReplyFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (e.target.value) e.target.value = ''

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const added: { url: string; name: string }[] = []
    for (const file of files) {
      const path = `${user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('notice-board').upload(path, file)
      if (error) continue
      const { data: { publicUrl } } = supabase.storage.from('notice-board').getPublicUrl(path)
      added.push({ url: publicUrl, name: file.name })
    }
    setReplyAttachments((prev) => [...prev, ...added])
    setUploading(false)
  }

  async function handleReply() {
    if (!replyText.trim() && replyAttachments.length === 0) return
    setLoading(true)
    const fd = new FormData()
    fd.append('post_id', post.id)
    fd.append('content', replyText)
    fd.append('attachments', JSON.stringify(replyAttachments.map((a) => a.url)))
    await createReply(fd)
    setReplyText('')
    setReplyAttachments([])
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
  const replyImageAttachments = replyAttachments.filter((a) => isImageUrl(a.url))
  const replyFileAttachments = replyAttachments.filter((a) => !isImageUrl(a.url))

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
        <AttachmentViewer urls={post.attachments ?? []} />
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-gray-700">{reply.profiles?.full_name}</span>
                          <span className="text-xs text-gray-400">
                            {new Date(reply.created_at).toLocaleDateString('ja-JP', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{reply.content}</p>
                        <AttachmentViewer urls={reply.attachments ?? []} small />
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

                {/* 返信の添付プレビュー */}
                {replyImageAttachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {replyImageAttachments.map((a) => {
                      const idx = replyAttachments.indexOf(a)
                      return (
                        <div key={idx} className="relative aspect-square group">
                          <img src={a.url} alt="添付" className="w-full h-full object-cover rounded-lg border border-gray-200" />
                          <button
                            type="button"
                            onClick={() => setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                {replyFileAttachments.map((a) => {
                  const idx = replyAttachments.indexOf(a)
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 flex-1 truncate">{a.name}</span>
                      <button
                        type="button"
                        onClick={() => setReplyAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}

                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                    title="ファイルを添付"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                    className="hidden"
                    onChange={handleReplyFileChange}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => { setReplying(false); setReplyAttachments([]) }}>
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleReply}
                    disabled={loading || uploading || (!replyText.trim() && replyAttachments.length === 0)}
                    className="gap-1.5 ml-auto"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {uploading ? 'アップロード中...' : loading ? '送信中...' : '返信する'}
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

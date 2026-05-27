'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createPost } from '@/app/actions/notice-board'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Paperclip, X, FileText } from 'lucide-react'
import type { Profile } from '@/types'

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|heic|avif|bmp)(\?|$)/i.test(url)
}

interface Attachment { url: string; name: string }

interface CreatePostDialogProps {
  role: string
  students: Profile[]
  defaultStudentId?: string
}

export function CreatePostDialog({ role, students, defaultStudentId }: CreatePostDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    if (e.target.value) e.target.value = ''

    const totalSize = files.reduce((sum, f) => sum + f.size, 0)
    if (totalSize > 20 * 1024 * 1024) {
      setError('合計20MB以下のファイルを選択してください')
      return
    }

    setUploading(true)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploading(false); return }

    const added: Attachment[] = []
    for (const file of files) {
      const path = `${user.id}/${Date.now()}_${file.name}`
      const { error: uploadErr } = await supabase.storage.from('notice-board').upload(path, file)
      if (uploadErr) { setError('アップロードに失敗しました'); continue }
      const { data: { publicUrl } } = supabase.storage.from('notice-board').getPublicUrl(path)
      added.push({ url: publicUrl, name: file.name })
    }
    setAttachments((prev) => [...prev, ...added])
    setUploading(false)
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    formData.set('is_visible_to_student', String(visible))
    formData.set('attachments', JSON.stringify(attachments.map((a) => a.url)))
    const result = await createPost(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      handleClose()
    }
  }

  function handleClose() {
    setOpen(false)
    setVisible(false)
    setAttachments([])
    setError(null)
  }

  const imageAttachments = attachments.filter((a) => isImageUrl(a.url))
  const fileAttachments = attachments.filter((a) => !isImageUrl(a.url))

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        新しい投稿
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>連絡板に投稿する</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 mt-2">
            {role === 'teacher' && students.length > 0 && (
              <div className="space-y-1">
                <Label htmlFor="student_id">対象生徒</Label>
                <select
                  id="student_id"
                  name="student_id"
                  defaultValue={defaultStudentId ?? ''}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">生徒を選択</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            )}
            {role === 'parent' && (
              <input type="hidden" name="student_id" value={defaultStudentId ?? ''} />
            )}

            <div className="space-y-1">
              <Label htmlFor="title">件名</Label>
              <Input id="title" name="title" placeholder="例：来週の授業について" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="content">内容</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="連絡内容を入力してください"
                rows={4}
                required
              />
            </div>

            {/* 添付ファイル */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>添付ファイル</Label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                  {uploading ? 'アップロード中...' : 'ファイルを追加'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* 画像プレビュー */}
              {imageAttachments.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {imageAttachments.map((a) => {
                    const idx = attachments.indexOf(a)
                    return (
                      <div key={idx} className="relative aspect-square group">
                        <img
                          src={a.url}
                          alt="添付画像"
                          className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ファイル一覧 */}
              {fileAttachments.map((a) => {
                const idx = attachments.indexOf(a)
                return (
                  <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700 flex-1 truncate">{a.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>

            {role === 'teacher' && (
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                  />
                  <div className={`w-10 h-6 rounded-full transition-colors ${visible ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${visible ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">生徒にも公開する</p>
                  <p className="text-xs text-gray-400">オンにすると生徒もこの投稿を閲覧できます</p>
                </div>
              </label>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>キャンセル</Button>
              <Button type="submit" disabled={loading || uploading}>
                {loading ? '投稿中...' : '投稿する'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

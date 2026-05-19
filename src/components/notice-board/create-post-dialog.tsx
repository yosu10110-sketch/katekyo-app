'use client'

import { useState } from 'react'
import { createPost } from '@/app/actions/notice-board'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { Profile } from '@/types'

interface CreatePostDialogProps {
  role: string
  students: Profile[]
  defaultStudentId?: string
}

export function CreatePostDialog({ role, students, defaultStudentId }: CreatePostDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    formData.set('is_visible_to_student', String(visible))
    const result = await createPost(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
      setVisible(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        新しい投稿
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
              <Textarea id="content" name="content" placeholder="連絡内容を入力してください" rows={4} required />
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={loading}>{loading ? '投稿中...' : '投稿する'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

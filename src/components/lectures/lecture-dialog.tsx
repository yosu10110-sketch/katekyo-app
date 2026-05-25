'use client'

import { useState } from 'react'
import { createLecture, updateLecture, deleteLecture } from '@/app/actions/lectures'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Profile, Lecture } from '@/types'

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface LectureDialogProps {
  students: Profile[]
  lecture?: Lecture
}

export function LectureDialog({ students, lecture }: LectureDialogProps) {
  const isEdit = !!lecture
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    if (isEdit) formData.append('lecture_id', lecture.id)
    const result = isEdit ? await updateLecture(formData) : await createLecture(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
  }

  async function handleDelete() {
    if (!lecture || !confirm('この講義情報を削除しますか？')) return
    setLoading(true)
    await deleteLecture(lecture.id)
    setLoading(false)
    setOpen(false)
  }

  return (
    <>
      {isEdit ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" />
          編集
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          講義を追加
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? '講義情報を編集' : '次回講義を登録'}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 mt-2">
            {!isEdit && (
              <div className="space-y-1">
                <Label htmlFor="student_id">対象生徒</Label>
                <select
                  id="student_id"
                  name="student_id"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">生徒を選択してください</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="title">授業タイトル</Label>
              <Input
                id="title"
                name="title"
                defaultValue={lecture?.title ?? ''}
                placeholder="例：数学 二次方程式"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>日時</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-gray-500">開始</p>
                  <Input
                    id="scheduled_at"
                    name="scheduled_at"
                    type="datetime-local"
                    defaultValue={lecture ? toLocalDatetimeValue(lecture.scheduled_at) : ''}
                    required
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-xs text-gray-500">終了（任意）</p>
                  <Input
                    id="scheduled_end_at"
                    name="scheduled_end_at"
                    type="datetime-local"
                    defaultValue={lecture?.scheduled_end_at ? toLocalDatetimeValue(lecture.scheduled_end_at) : ''}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="meeting_url">会議URL（Zoom等）</Label>
              <Input
                id="meeting_url"
                name="meeting_url"
                type="url"
                defaultValue={lecture?.meeting_url ?? ''}
                placeholder="https://zoom.us/j/..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="preparation_notes">持ち物・準備事項</Label>
              <Textarea
                id="preparation_notes"
                name="preparation_notes"
                defaultValue={lecture?.preparation_notes ?? ''}
                placeholder="例：教科書p.45〜50、計算ドリル"
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
            )}

            <div className="flex items-center justify-between">
              {isEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={loading}
                  className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  削除
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  キャンセル
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? '保存中...' : isEdit ? '更新する' : '登録する'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

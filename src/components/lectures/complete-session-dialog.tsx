'use client'

import { useState, useTransition } from 'react'
import { completeLecture } from '@/app/actions/lectures'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2 } from 'lucide-react'
import type { Lecture } from '@/types'

export function CompleteSessionButton({ lecture, onComplete }: { lecture: Lecture; onComplete?: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const defaultDuration = lecture.scheduled_end_at
    ? Math.round(
        (new Date(lecture.scheduled_end_at).getTime() - new Date(lecture.scheduled_at).getTime()) / 60000,
      )
    : null

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.append('lecture_id', lecture.id)
    setError(null)
    // 楽観的UI：ダイアログを即閉じ、完了状態を即反映
    setOpen(false)
    onComplete?.()
    startTransition(async () => {
      const result = await completeLecture(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        授業完了
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              授業完了レポート
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="teacher_comment">保護者へのコメント</Label>
              <Textarea
                id="teacher_comment"
                name="teacher_comment"
                placeholder="今日の授業内容・お子さんの様子を保護者にお伝えしましょう"
                rows={3}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="homework">次回までの宿題</Label>
              <Textarea
                id="homework"
                name="homework"
                placeholder="例：教科書p.45〜50の練習問題を解く"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="duration_minutes">指導時間（分）</Label>
                <Input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min="1"
                  defaultValue={defaultDuration ?? ''}
                  placeholder="60"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fee">指導料（円）</Label>
                <Input
                  id="fee"
                  name="fee"
                  type="number"
                  min="0"
                  placeholder="5000"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isPending} className="bg-green-600 hover:bg-green-700">
                {isPending ? '保存中...' : '完了として記録'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

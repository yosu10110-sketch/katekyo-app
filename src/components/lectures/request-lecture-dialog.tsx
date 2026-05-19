'use client'

import { useState, useTransition } from 'react'
import { createLectureRequest } from '@/app/actions/lecture-requests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarPlus } from 'lucide-react'

interface RequestLectureDialogProps {
  teacherId: string
}

export function RequestLectureDialog({ teacherId }: RequestLectureDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setOpen(false)
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      formData.set('teacher_id', teacherId)
      const result = await createLectureRequest(formData)
      if ('error' in result) {
        setError(result.error ?? 'エラーが発生しました')
      } else {
        setSuccess(true)
        setTimeout(() => handleClose(), 1500)
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <CalendarPlus className="h-4 w-4" />
        講義を申請する
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>講義日程の申請</DialogTitle>
          </DialogHeader>
          {success ? (
            <div className="py-6 text-center text-green-700">
              <CalendarPlus className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">申請しました。教師の承認をお待ちください。</p>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="desired_at">希望日時</Label>
                <Input id="desired_at" name="desired_at" type="datetime-local" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">備考・要望（任意）</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="例：数学の二次関数を重点的にお願いします"
                  rows={3}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleClose}>キャンセル</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? '申請中...' : '申請する'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

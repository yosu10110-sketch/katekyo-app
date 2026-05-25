'use client'

import { useState, useTransition } from 'react'
import { createLectureRequest } from '@/app/actions/lecture-requests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CalendarPlus } from 'lucide-react'

type RequestType = 'datetime' | 'timerange' | 'allday'

interface RequestLectureDialogProps {
  teacherId: string
}

const REQUEST_TYPES: { key: RequestType; label: string; desc: string }[] = [
  { key: 'datetime', label: '日時を指定', desc: 'この日この時間で' },
  { key: 'timerange', label: '時間帯を指定', desc: 'この時間帯ならOK' },
  { key: 'allday', label: '終日', desc: 'この日ならいつでも' },
]

export function RequestLectureDialog({ teacherId }: RequestLectureDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [requestType, setRequestType] = useState<RequestType>('datetime')
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setOpen(false)
    setError(null)
    setSuccess(false)
    setRequestType('datetime')
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      formData.set('teacher_id', teacherId)
      formData.set('request_type', requestType)
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
              {/* 申請タイプ選択 */}
              <div className="space-y-1.5">
                <Label>申請タイプ</Label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
                  {REQUEST_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setRequestType(t.key)}
                      className={`flex-1 py-2.5 transition-colors font-medium ${
                        requestType === t.key
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center">
                  {REQUEST_TYPES.find((t) => t.key === requestType)?.desc}
                </p>
              </div>

              {/* 希望日 */}
              <div className="space-y-1.5">
                <Label htmlFor="desired_date">希望日</Label>
                <Input id="desired_date" name="desired_date" type="date" required />
              </div>

              {/* 日時指定：時刻1つ */}
              {requestType === 'datetime' && (
                <div className="space-y-1.5">
                  <Label htmlFor="start_time">希望時刻</Label>
                  <Input id="start_time" name="start_time" type="time" required />
                </div>
              )}

              {/* 時間帯指定：開始〜終了 */}
              {requestType === 'timerange' && (
                <div className="space-y-1.5">
                  <Label>希望時間帯</Label>
                  <div className="flex items-center gap-2">
                    <Input name="start_time" type="time" required className="flex-1" />
                    <span className="text-gray-400 text-sm shrink-0">〜</span>
                    <Input name="end_time" type="time" required className="flex-1" />
                  </div>
                </div>
              )}

              {/* 終日：日付のみ */}
              {requestType === 'allday' && (
                <p className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                  この日であれば時間はいつでも大丈夫、と教師に伝わります。
                </p>
              )}

              <div className="space-y-1.5">
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

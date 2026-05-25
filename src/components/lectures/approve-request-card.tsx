'use client'

import { useState, useTransition } from 'react'
import { approveLectureRequest, rejectLectureRequest, formatLectureRequest } from '@/app/actions/lecture-requests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, X, CalendarClock, Clock, CalendarDays } from 'lucide-react'

interface Request {
  id: string
  desired_at: string
  request_type?: string | null
  desired_date?: string | null
  start_time?: string | null
  end_time?: string | null
  notes: string | null
  profiles: { full_name: string } | null
}

const typeConfig = {
  datetime: { label: '日時指定', icon: Clock, color: 'bg-indigo-100 text-indigo-700' },
  timerange: { label: '時間帯指定', icon: CalendarClock, color: 'bg-green-100 text-green-700' },
  allday: { label: '終日', icon: CalendarDays, color: 'bg-amber-100 text-amber-700' },
}

export function ApproveRequestCard({ request }: { request: Request }) {
  const [meetingUrl, setMeetingUrl] = useState('')
  const [isPending, startTransition] = useTransition()
  const [done, setDone] = useState<'approved' | 'rejected' | null>(null)

  function handleApprove() {
    startTransition(async () => {
      await approveLectureRequest(request.id, meetingUrl || undefined)
      setDone('approved')
    })
  }

  function handleReject() {
    startTransition(async () => {
      await rejectLectureRequest(request.id)
      setDone('rejected')
    })
  }

  if (done === 'approved') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-3 flex items-center gap-2 text-green-700 text-sm">
          <Check className="h-4 w-4" />
          承認しました。講義に追加されました。
        </CardContent>
      </Card>
    )
  }
  if (done === 'rejected') {
    return (
      <Card className="border-gray-200 bg-gray-50 opacity-60">
        <CardContent className="py-3 text-gray-400 text-sm">却下しました。</CardContent>
      </Card>
    )
  }

  const type = (request.request_type || 'datetime') as keyof typeof typeConfig
  const config = typeConfig[type] ?? typeConfig.datetime
  const timeDisplay = formatLectureRequest(request)

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-amber-600" />
          {request.profiles?.full_name} さんからの申請
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-2">
          <Badge className={`text-xs shrink-0 ${config.color}`}>{config.label}</Badge>
          <p className="text-sm text-gray-700 font-medium">{timeDisplay}</p>
        </div>
        {request.notes && (
          <div className="text-sm text-gray-600 bg-white border border-amber-200 rounded-md p-2">
            {request.notes}
          </div>
        )}
        <Input
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="ZoomのURL（任意）"
          className="bg-white"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 bg-green-600 hover:bg-green-700 gap-1"
          >
            <Check className="h-3.5 w-3.5" />
            承認して講義に追加
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReject}
            disabled={isPending}
            className="text-red-500 hover:text-red-600 hover:bg-red-50 gap-1"
          >
            <X className="h-3.5 w-3.5" />
            却下
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

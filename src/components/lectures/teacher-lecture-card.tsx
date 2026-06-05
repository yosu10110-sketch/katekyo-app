'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CompleteSessionButton } from './complete-session-dialog'
import { LectureDialog } from './lecture-dialog'
import { Calendar, Video, MessageSquare, BookOpen, Clock } from 'lucide-react'
import type { Lecture, Profile } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'long', hour: '2-digit', minute: '2-digit',
  })
}

interface TeacherLectureCardProps {
  lecture: Lecture & { profiles?: { full_name: string } }
  students: Profile[]
}

export function TeacherLectureCard({ lecture, students }: TeacherLectureCardProps) {
  const [localStatus, setLocalStatus] = useState(lecture.status ?? 'scheduled')
  const [deleted, setDeleted] = useState(false)

  if (deleted) return null

  const isScheduled = localStatus === 'scheduled' || !localStatus
  const isCompleted = localStatus === 'completed'
  const isCancelled = localStatus === 'cancelled'

  return (
    <Card
      className={
        isCompleted
          ? 'border-green-200 bg-green-50/20'
          : isCancelled
          ? 'opacity-50 border-gray-200'
          : ''
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">{lecture.title}</CardTitle>
              {isCompleted && (
                <Badge className="bg-green-100 text-green-700 text-xs shrink-0">完了</Badge>
              )}
              {isCancelled && (
                <Badge className="bg-gray-100 text-gray-500 text-xs shrink-0">キャンセル</Badge>
              )}
            </div>
            {lecture.profiles && (
              <p className="text-xs text-gray-500 mt-0.5">{lecture.profiles.full_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isScheduled && (
              <CompleteSessionButton
                lecture={lecture}
                onComplete={() => setLocalStatus('completed')}
              />
            )}
            <LectureDialog
              students={students}
              lecture={lecture}
              onDeleted={() => setDeleted(true)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Calendar className="h-3.5 w-3.5 text-green-500 shrink-0" />
          <span>
            {formatDate(lecture.scheduled_at)}
            {lecture.scheduled_end_at && (
              <span className="text-gray-400">
                {' 〜 '}
                {new Date(lecture.scheduled_end_at).toLocaleTimeString('ja-JP', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </span>
        </div>
        {lecture.meeting_url && (
          <a
            href={lecture.meeting_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 w-fit"
          >
            <Video className="h-3.5 w-3.5 shrink-0" />
            <span className="underline underline-offset-2">Zoomで参加する</span>
          </a>
        )}
        {isCompleted && (
          <div className="space-y-2 pt-1">
            {lecture.teacher_comment && (
              <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <MessageSquare className="h-3 w-3 text-blue-500" />
                  <p className="text-xs font-semibold text-blue-700">保護者コメント</p>
                </div>
                <p className="text-sm text-blue-800">{lecture.teacher_comment}</p>
              </div>
            )}
            {lecture.homework && (
              <div className="bg-amber-50 border border-amber-100 rounded-md p-2.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <BookOpen className="h-3 w-3 text-amber-600" />
                  <p className="text-xs font-semibold text-amber-700">宿題</p>
                </div>
                <p className="text-sm text-amber-800">{lecture.homework}</p>
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500 pt-0.5">
              {lecture.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lecture.duration_minutes}分
                </span>
              )}
              {lecture.fee != null && (
                <span className="font-semibold text-indigo-700">
                  ¥{lecture.fee.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

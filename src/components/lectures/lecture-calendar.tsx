'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lecture, Profile } from '@/types'

type LectureWithProfile = Lecture & { profiles?: { full_name: string } }

interface LectureCalendarProps {
  lectures: LectureWithProfile[]
  role: string
}

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

export function LectureCalendar({ lectures, role }: LectureCalendarProps) {
  const today = new Date()
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selected, setSelected] = useState<Date | null>(null)

  const { year, month } = current

  // カレンダーの日付生成
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // 月曜始まり
  const startOffset = (firstDay.getDay() + 6) % 7
  const days: (Date | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))

  // 講義をdate文字列でグループ化
  const lecturesByDate: Record<string, LectureWithProfile[]> = {}
  for (const l of lectures) {
    const d = new Date(l.scheduled_at)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!lecturesByDate[key]) lecturesByDate[key] = []
    lecturesByDate[key].push(l)
  }

  function dateKey(d: Date) {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }

  const selectedLectures = selected ? (lecturesByDate[dateKey(selected)] ?? []) : []

  function prevMonth() {
    setCurrent(({ year, month }) => month === 0
      ? { year: year - 1, month: 11 }
      : { year, month: month - 1 }
    )
    setSelected(null)
  }

  function nextMonth() {
    setCurrent(({ year, month }) => month === 11
      ? { year: year + 1, month: 0 }
      : { year, month: month + 1 }
    )
    setSelected(null)
  }

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()

  const isSelected = (d: Date) =>
    selected &&
    d.getFullYear() === selected.getFullYear() &&
    d.getMonth() === selected.getMonth() &&
    d.getDate() === selected.getDate()

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-900">
          {year}年{month + 1}月
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={cn(
            'text-center text-xs font-medium py-1',
            i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-500'
          )}>
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {days.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} className="bg-gray-50 min-h-[80px] md:min-h-[120px]" />
          const key = dateKey(d)
          const dayLectures = lecturesByDate[key] ?? []
          const dow = (d.getDay() + 6) % 7 // 月曜=0
          return (
            <button
              key={key}
              onClick={() => setSelected(isSelected(d) ? null : d)}
              className={cn(
                'bg-white min-h-[80px] md:min-h-[120px] p-1.5 text-left transition-colors hover:bg-indigo-50 flex flex-col',
                isSelected(d) && 'bg-indigo-50',
              )}
            >
              <span className={cn(
                'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5',
                isToday(d) && 'bg-indigo-600 text-white',
                !isToday(d) && dow === 5 && 'text-blue-500',
                !isToday(d) && dow === 6 && 'text-red-500',
                !isToday(d) && dow < 5 && 'text-gray-700',
              )}>
                {d.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 w-full overflow-hidden">
                {dayLectures.slice(0, 3).map((l) => (
                  <div
                    key={l.id}
                    className="text-[10px] bg-indigo-100 text-indigo-700 rounded px-1 truncate leading-4"
                  >
                    {role === 'teacher' && l.profiles ? l.profiles.full_name : l.title}
                  </div>
                ))}
                {dayLectures.length > 2 && (
                  <div className="text-[10px] text-gray-400 px-1">+{dayLectures.length - 2}件</div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* 選択日の詳細 */}
      {selected && (
        <div className="border border-indigo-200 rounded-xl overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-indigo-700">
              {selected.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
          </div>
          {selectedLectures.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">講義の予定はありません</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedLectures.map((l) => (
                <div key={l.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900 text-sm">{l.title}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(l.scheduled_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {role === 'teacher' && l.profiles && (
                    <p className="text-xs text-gray-500 mt-0.5">{l.profiles.full_name}</p>
                  )}
                  {l.meeting_url && (
                    <a href={l.meeting_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline mt-1 block">
                      Zoom参加
                    </a>
                  )}
                  {l.preparation_notes && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded p-1.5 mt-1">{l.preparation_notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

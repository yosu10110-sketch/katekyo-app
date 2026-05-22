'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Circle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Assignment } from '@/types'

const WEEKDAYS = ['月', '火', '水', '木', '金', '土', '日']

function getWeekDates(base: Date): Date[] {
  const d = new Date(base)
  const day = (d.getDay() + 6) % 7 // 月曜=0
  d.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return dd
  })
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function isToday(d: Date) {
  const t = new Date()
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
}

function assignmentStatus(a: Assignment) {
  const now = new Date()
  if (a.status === 'reviewed') return 'reviewed'
  if (a.status === 'submitted') return 'submitted'
  if (a.due_date && new Date(a.due_date) < now) return 'overdue'
  return 'pending'
}

const statusStyle = {
  reviewed:  { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 border-green-200',  label: '完了' },
  submitted: { icon: Clock,        color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200',   label: '採点待ち' },
  overdue:   { icon: AlertCircle,  color: 'text-red-500',   bg: 'bg-red-50 border-red-200',       label: '期限切れ' },
  pending:   { icon: Circle,       color: 'text-gray-400',  bg: 'bg-white border-gray-200',       label: '未提出' },
}

interface WeeklyCalendarProps {
  assignments: Assignment[]
}

export function WeeklyCalendar({ assignments }: WeeklyCalendarProps) {
  const [baseDate, setBaseDate] = useState(new Date())
  const weekDates = getWeekDates(baseDate)

  // 課題を日付でグループ化（due_date基準）
  const byDate: Record<string, Assignment[]> = {}
  const noDueDate: Assignment[] = []

  for (const a of assignments) {
    if (!a.due_date) { noDueDate.push(a); continue }
    const key = dateKey(new Date(a.due_date))
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(a)
  }

  function prevWeek() {
    const d = new Date(baseDate)
    d.setDate(d.getDate() - 7)
    setBaseDate(d)
  }

  function nextWeek() {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + 7)
    setBaseDate(d)
  }

  const weekLabel = `${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()} 〜 ${weekDates[6].getMonth() + 1}/${weekDates[6].getDate()}`

  return (
    <div className="space-y-4">
      {/* ナビゲーション */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-700">{weekLabel}</span>
        <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* 週間グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {weekDates.map((d, i) => {
          const key = dateKey(d)
          const dayAssignments = byDate[key] ?? []
          const dow = i
          const today = isToday(d)

          return (
            <div key={key} className="flex flex-col gap-1">
              {/* 曜日ヘッダー */}
              <div className="text-center">
                <span className={cn(
                  'text-xs font-medium',
                  dow === 5 ? 'text-blue-500' : dow === 6 ? 'text-red-500' : 'text-gray-500'
                )}>{WEEKDAYS[i]}</span>
                <div className={cn(
                  'mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold',
                  today ? 'bg-indigo-600 text-white' : 'text-gray-700'
                )}>
                  {d.getDate()}
                </div>
              </div>

              {/* 課題カード */}
              <div className="min-h-[80px] flex flex-col gap-1">
                {dayAssignments.map((a) => {
                  const st = assignmentStatus(a)
                  const { icon: Icon, color, bg } = statusStyle[st]
                  return (
                    <Link key={a.id} href={`/assignments/${a.id}`}>
                      <div className={cn('border rounded-lg p-1.5 cursor-pointer hover:opacity-80 transition-opacity', bg)}>
                        <div className="flex items-start gap-1">
                          <Icon className={cn('h-3 w-3 shrink-0 mt-0.5', color)} />
                          <p className="text-[10px] leading-tight text-gray-800 line-clamp-2">{a.title}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        {Object.entries(statusStyle).map(([key, { icon: Icon, color, label }]) => (
          <div key={key} className="flex items-center gap-1">
            <Icon className={cn('h-3 w-3', color)} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* 期限なし課題 */}
      {noDueDate.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">期限なし課題</p>
          <div className="space-y-1">
            {noDueDate.map((a) => {
              const st = assignmentStatus(a)
              const { icon: Icon, color, bg } = statusStyle[st]
              return (
                <Link key={a.id} href={`/assignments/${a.id}`}>
                  <div className={cn('border rounded-lg p-2 flex items-center gap-2 hover:opacity-80', bg)}>
                    <Icon className={cn('h-4 w-4 shrink-0', color)} />
                    <span className="text-sm text-gray-800">{a.title}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

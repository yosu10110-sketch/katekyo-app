'use client'

import { useState } from 'react'
import { toggleUnit, deleteMaterial } from '@/app/actions/curriculum'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Trash2, CheckCircle2, Circle } from 'lucide-react'
import type { CurriculumMaterial, CurriculumUnit } from '@/types'

interface MaterialCardProps {
  material: CurriculumMaterial & { curriculum_units: CurriculumUnit[] }
  role: string
  studentName?: string
}

export function MaterialCard({ material, role, studentName }: MaterialCardProps) {
  const units = material.curriculum_units ?? []
  const completed = units.filter((u) => u.is_completed).length
  const total = units.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  async function handleToggle(unit: CurriculumUnit) {
    setToggling(unit.id)
    await toggleUnit(unit.id, unit.is_completed)
    setToggling(null)
  }

  async function handleDelete() {
    if (!confirm('この教材を削除しますか？単元データも削除されます。')) return
    await deleteMaterial(material.id)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{material.subject}</Badge>
              {studentName && (
                <span className="text-xs text-gray-400">{studentName}</span>
              )}
            </div>
            <h3 className="font-semibold text-gray-900">{material.title}</h3>
          </div>
          {role === 'teacher' && (
            <button
              onClick={handleDelete}
              className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* プログレスバー */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{completed} / {total} 単元完了</span>
            <span className={`font-semibold ${percent === 100 ? 'text-green-600' : 'text-indigo-600'}`}>
              {percent}%
            </span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      </div>

      {/* 単元チェックリスト */}
      {total > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 transition-colors"
          >
            <span>単元一覧を{expanded ? '閉じる' : '表示する'}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expanded && (
            <div className="px-4 py-3 space-y-1.5">
              {units
                .sort((a, b) => a.unit_number - b.unit_number)
                .map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => role === 'teacher' ? handleToggle(unit) : undefined}
                    disabled={toggling === unit.id || role !== 'teacher'}
                    className={`w-full flex items-center gap-3 py-1.5 px-2 rounded-md text-left transition-colors ${
                      role === 'teacher' ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                    } ${toggling === unit.id ? 'opacity-50' : ''}`}
                  >
                    {unit.is_completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                    )}
                    <span className={`text-sm ${unit.is_completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {unit.unit_number}. {unit.unit_title}
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

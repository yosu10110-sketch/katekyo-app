'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GraduationCap } from 'lucide-react'
import { GRADES } from '@/types'

interface GradeSelectorProps {
  studentId: string
  initialGrade: string | null
}

export function GradeSelector({ studentId, initialGrade }: GradeSelectorProps) {
  const [grade, setGrade] = useState(initialGrade ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  async function handleChange(value: string) {
    setGrade(value)
    startTransition(async () => {
      const supabase = createClient()
      await supabase
        .from('profiles')
        .update({ grade: value || null })
        .eq('id', studentId)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-700">学年</p>
          <p className="text-xs text-gray-400">生徒の学年を設定</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {saved && <span className="text-xs text-green-600">保存済み</span>}
        <select
          value={grade}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          className="text-sm rounded-lg border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">未設定</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

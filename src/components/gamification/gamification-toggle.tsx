'use client'

import { useState, useTransition } from 'react'
import { setGamificationEnabled } from '@/app/actions/gamification'
import { Gamepad2 } from 'lucide-react'

interface GamificationToggleProps {
  studentId: string
  initialEnabled: boolean
}

export function GamificationToggle({ studentId, initialEnabled }: GamificationToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const next = !enabled
      await setGamificationEnabled(studentId, next)
      setEnabled(next)
    })
  }

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2">
        <Gamepad2 className="h-4 w-4 text-gray-500" />
        <div>
          <p className="text-sm font-medium text-gray-700">ゲーミフィケーション</p>
          <p className="text-xs text-gray-400">ストリーク・バッジ機能</p>
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  )
}

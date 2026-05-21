'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, GraduationCap, Users, Heart } from 'lucide-react'

const ROLES = [
  {
    value: 'teacher',
    label: '教師',
    desc: '生徒に課題を出したり講義を管理します',
    icon: GraduationCap,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    activeColor: 'bg-indigo-600 border-indigo-600 text-white',
  },
  {
    value: 'student',
    label: '生徒',
    desc: '課題を提出したり講義を確認します',
    icon: BookOpen,
    color: 'bg-green-50 border-green-200 text-green-700',
    activeColor: 'bg-green-600 border-green-600 text-white',
  },
  {
    value: 'parent',
    label: '保護者',
    desc: 'お子さんの学習状況を確認します',
    icon: Heart,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    activeColor: 'bg-amber-600 border-amber-600 text-white',
  },
]

export default function OnboardingPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit() {
    if (!selected) return
    startTransition(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { error } = await supabase
        .from('profiles')
        .update({ role: selected })
        .eq('id', user.id)

      if (error) { setError('エラーが発生しました'); return }
      router.push('/dashboard')
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-4 rounded-3xl mb-4 shadow-lg">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ようこそ！</h1>
          <p className="text-gray-500 text-sm mt-2">あなたのロールを選択してください</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {ROLES.map((role) => {
            const isSelected = selected === role.value
            return (
              <button
                key={role.value}
                onClick={() => setSelected(role.value)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected ? role.activeColor : `${role.color} hover:opacity-80`
                }`}
              >
                <role.icon className="h-8 w-8 shrink-0" />
                <div>
                  <p className="font-bold text-lg">{role.label}</p>
                  <p className={`text-sm ${isSelected ? 'opacity-90' : 'opacity-70'}`}>{role.desc}</p>
                </div>
              </button>
            )
          })}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!selected || isPending}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl transition-colors mt-2"
          >
            {isPending ? '設定中...' : 'はじめる'}
          </button>
        </div>
      </div>
    </div>
  )
}

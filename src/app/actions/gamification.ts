'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ストリーク計算（締切前提出の連続回数）
export async function getStudentStreak(studentId: string) {
  const supabase = await createClient()

  // 締切あり課題を古い順に取得
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, due_date, status')
    .eq('student_id', studentId)
    .not('due_date', 'is', null)
    .order('due_date', { ascending: false })

  if (!assignments || assignments.length === 0) return { current: 0, longest: 0 }

  // 各課題の提出物を取得
  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('assignment_id, submitted_at')
    .in('assignment_id', assignments.map(a => a.id))

  const submissionMap = new Map(submissions?.map(s => [s.assignment_id, s.submitted_at]) ?? [])

  // 新しい順に連続チェック（過去の課題が期限切れなら連続終了）
  let current = 0
  let longest = 0
  let streak = 0
  let counting = true

  // 古い順にして連続を計算
  const sorted = [...assignments].sort((a, b) =>
    new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
  )

  for (const a of sorted) {
    const submittedAt = submissionMap.get(a.id)
    const dueDate = new Date(a.due_date!)
    const now = new Date()

    // 締切が未来のものはスキップ
    if (dueDate > now) continue

    const onTime = submittedAt && new Date(submittedAt) <= dueDate

    if (onTime) {
      streak++
      longest = Math.max(longest, streak)
    } else {
      streak = 0
    }
  }

  // current は最新連続（末尾から逆算）
  current = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    const a = sorted[i]
    const dueDate = new Date(a.due_date!)
    const now = new Date()
    if (dueDate > now) continue

    const submittedAt = submissionMap.get(a.id)
    const onTime = submittedAt && new Date(submittedAt) <= dueDate
    if (onTime) {
      current++
    } else {
      break
    }
  }

  return { current, longest }
}

// バッジチェック・付与
export async function checkAndAwardBadges(studentId: string) {
  const supabase = await createClient()

  const { current, longest } = await getStudentStreak(studentId)

  // 提出済み課題数
  const { count: submitCount } = await supabase
    .from('assignment_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)

  // 既存バッジ
  const { data: existing } = await supabase
    .from('student_badges')
    .select('badge_id')
    .eq('student_id', studentId)
  const earned = new Set(existing?.map(b => b.badge_id) ?? [])

  const toAward: string[] = []

  if ((submitCount ?? 0) >= 1 && !earned.has('first_submit')) toAward.push('first_submit')
  if (current >= 3 && !earned.has('streak_3')) toAward.push('streak_3')
  if (current >= 7 && !earned.has('streak_7')) toAward.push('streak_7')
  if (current >= 30 && !earned.has('streak_30')) toAward.push('streak_30')

  if (toAward.length > 0) {
    await supabase.from('student_badges').insert(
      toAward.map(badge_id => ({ student_id: studentId, badge_id }))
    )
  }

  return toAward
}

// ゲーミフィケーション設定取得
export async function getGamificationSetting(studentId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gamification_settings')
    .select('is_enabled')
    .eq('student_id', studentId)
    .single()
  return data?.is_enabled ?? true
}

// ゲーミフィケーション設定変更（教師/保護者）
export async function setGamificationEnabled(studentId: string, isEnabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const { error } = await supabase
    .from('gamification_settings')
    .upsert({ student_id: studentId, is_enabled: isEnabled, updated_by: user.id, updated_at: new Date().toISOString() })

  if (error) return { error: error.message }
  revalidatePath('/students')
  return { success: true }
}

// 生徒のバッジ一覧取得
export async function getStudentBadges(studentId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('student_badges')
    .select('badge_id, earned_at, badges(id, name, description, icon)')
    .eq('student_id', studentId)
    .order('earned_at', { ascending: false })
  return data ?? []
}

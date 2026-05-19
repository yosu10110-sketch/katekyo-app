import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList, Calendar, MessageCircle, BarChart3,
  MessageSquare, ChevronRight, ChevronLeft, Clock, CheckCircle2, Circle,
} from 'lucide-react'
import type { Profile } from '@/types'

export default async function StudentHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 教師であることを確認
  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'teacher') redirect('/dashboard')

  // 担当生徒か確認
  const { data: rel } = await supabase
    .from('teacher_student_relationships')
    .select('student_id')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .single()
  if (!rel) notFound()

  // 生徒プロフィール取得
  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .single()
  if (!student) notFound()

  // 課題サマリ
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id, title, status, due_date')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(3)

  const pendingCount = (await supabase
    .from('assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .eq('status', 'pending')).count ?? 0

  const submittedCount = (await supabase
    .from('assignments')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .eq('status', 'submitted')).count ?? 0

  // 次回講義
  const { data: lectures } = await supabase
    .from('lectures')
    .select('*')
    .eq('teacher_id', user.id)
    .eq('student_id', studentId)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at')
    .limit(1)
  const nextLecture = lectures?.[0]

  const statusConfig = {
    pending: { label: '未提出', icon: Circle, color: 'text-gray-400' },
    submitted: { label: '採点待ち', icon: Clock, color: 'text-amber-500' },
    reviewed: { label: '完了', icon: CheckCircle2, color: 'text-green-500' },
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 戻るボタン＋ヘッダー */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3">
          <ChevronLeft className="h-4 w-4" />
          生徒一覧に戻る
        </Link>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold">
            {(student as Profile).full_name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{(student as Profile).full_name}</h2>
            <div className="flex gap-2 mt-1">
              {submittedCount > 0 && (
                <Badge className="bg-amber-100 text-amber-700 text-xs">採点待ち {submittedCount}件</Badge>
              )}
              {pendingCount > 0 && (
                <Badge className="bg-gray-100 text-gray-600 text-xs">未提出 {pendingCount}件</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 機能ナビ */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: `/assignments?student=${studentId}`, icon: ClipboardList, label: '課題管理', color: 'bg-indigo-50 text-indigo-600', desc: `未提出${pendingCount}件 / 採点待ち${submittedCount}件` },
          { href: `/lectures?student=${studentId}`, icon: Calendar, label: '次回講義', color: 'bg-green-50 text-green-600', desc: nextLecture ? new Date(nextLecture.scheduled_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '予定なし' },
          { href: `/chat?student=${studentId}`, icon: MessageCircle, label: 'チャット', color: 'bg-blue-50 text-blue-600', desc: 'メッセージを送る' },
          { href: `/curriculum?student=${studentId}`, icon: BarChart3, label: '教材進捗', color: 'bg-purple-50 text-purple-600', desc: 'カリキュラム管理' },
          { href: `/notice-board?student=${studentId}`, icon: MessageSquare, label: '連絡板', color: 'bg-amber-50 text-amber-600', desc: '保護者への連絡' },
        ].map(({ href, icon: Icon, label, color, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 py-4">
                <div className={`p-2.5 rounded-xl ${color} shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{label}</p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 ml-auto shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 最近の課題 */}
      {assignments && assignments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700">最近の課題</CardTitle>
              <Link href={`/assignments?student=${studentId}`} className="text-xs text-indigo-600 hover:underline">
                すべて見る
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignments.map((a) => {
              const s = statusConfig[a.status as keyof typeof statusConfig]
              return (
                <Link key={a.id} href={`/assignments/${a.id}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <s.icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                    <span className="text-sm text-gray-800 flex-1 truncate">{a.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">{s.label}</Badge>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 次回講義詳細 */}
      {nextLecture && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              次回講義
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-gray-900">{nextLecture.title}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              {new Date(nextLecture.scheduled_at).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            {nextLecture.meeting_url && (
              <a
                href={nextLecture.meeting_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md"
              >
                Zoom参加
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

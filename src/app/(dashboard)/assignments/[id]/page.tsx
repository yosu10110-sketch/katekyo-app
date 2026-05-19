import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SubmissionUpload } from '@/components/assignments/submission-upload'
import { FeedbackForm } from '@/components/assignments/feedback-form'
import { ArrowLeft, FileText, ImageIcon, MessageSquareDot, Clock, Paperclip } from 'lucide-react'
import type { Profile, AssignmentSubmission } from '@/types'

const statusConfig = {
  pending: { label: '未提出', className: 'bg-gray-100 text-gray-600' },
  submitted: { label: '提出済み・採点待ち', className: 'bg-amber-100 text-amber-700' },
  reviewed: { label: 'フィードバック済み', className: 'bg-green-100 text-green-700' },
}

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  const { role } = profile as Profile

  const { data: assignment } = await supabase
    .from('assignments')
    .select('*, profiles!assignments_student_id_fkey(full_name, avatar_url)')
    .eq('id', id)
    .single()

  if (!assignment) notFound()

  // 提出物を取得
  const { data: submissions } = await supabase
    .from('assignment_submissions')
    .select('*')
    .eq('assignment_id', id)
    .order('submitted_at', { ascending: false })

  const latestSubmission = submissions?.[0] as AssignmentSubmission | undefined

  const status = statusConfig[assignment.status as keyof typeof statusConfig]

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/assignments"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        課題一覧に戻る
      </Link>

      {/* 課題情報 */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-xl">{assignment.title}</CardTitle>
            <Badge className={`shrink-0 ${status.className}`}>{status.label}</Badge>
          </div>
          {role === 'teacher' && assignment.profiles && (
            <p className="text-sm text-gray-500">対象生徒：{(assignment.profiles as { full_name: string }).full_name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {assignment.description && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">課題内容</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 rounded-md p-3">
                {assignment.description}
              </p>
            </div>
          )}
          {assignment.due_date && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>
                提出期限：{new Date(assignment.due_date).toLocaleDateString('ja-JP', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  weekday: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 生徒：提出フォーム */}
      {role === 'student' && assignment.status !== 'reviewed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {assignment.status === 'submitted' ? '提出物を再提出' : '課題を提出する'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SubmissionUpload assignmentId={id} />
          </CardContent>
        </Card>
      )}

      {/* 提出物の表示 */}
      {latestSubmission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              提出物
            </CardTitle>
            <p className="text-xs text-gray-400">
              {new Date(latestSubmission.submitted_at).toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })} 提出
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestSubmission.file_type === 'image' ? (
              <div className="rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={latestSubmission.file_url}
                  alt="提出物"
                  className="w-full object-contain max-h-96"
                />
              </div>
            ) : (
              <a
                href={latestSubmission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg p-4 hover:bg-red-100 transition-colors"
              >
                <ImageIcon className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">PDF ファイルを開く</p>
                  <p className="text-xs text-gray-500">新しいタブで開きます</p>
                </div>
              </a>
            )}

            {/* フィードバック表示 */}
            {(latestSubmission.feedback_comment || latestSubmission.feedback_file_url) && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquareDot className="h-4 w-4 text-indigo-500" />
                    <p className="text-sm font-semibold text-indigo-700">教師のフィードバック</p>
                    {latestSubmission.feedback_at && (
                      <p className="text-xs text-gray-400">
                        {new Date(latestSubmission.feedback_at).toLocaleDateString('ja-JP', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                  {latestSubmission.feedback_comment && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap bg-indigo-50 rounded-md p-3">
                      {latestSubmission.feedback_comment}
                    </p>
                  )}
                  {latestSubmission.feedback_file_url && (
                    <a
                      href={latestSubmission.feedback_file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-md p-3 hover:bg-indigo-100 transition-colors"
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      {latestSubmission.feedback_file_type === 'image' ? '返却画像を開く' : '返却PDFを開く'}
                    </a>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* 教師：フィードバックフォーム */}
      {role === 'teacher' && latestSubmission && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquareDot className="h-4 w-4 text-indigo-500" />
              フィードバックを入力
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackForm
              submissionId={latestSubmission.id}
              assignmentId={id}
              existingFeedback={latestSubmission.feedback_comment}
              existingFeedbackFileUrl={latestSubmission.feedback_file_url}
              existingFeedbackFileType={latestSubmission.feedback_file_type}
            />
          </CardContent>
        </Card>
      )}

      {/* 教師：まだ提出なし */}
      {role === 'teacher' && !latestSubmission && (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">まだ提出物がありません</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

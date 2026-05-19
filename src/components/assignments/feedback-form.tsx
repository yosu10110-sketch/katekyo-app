'use client'

import { useState, useRef } from 'react'
import { saveFeedback } from '@/app/actions/assignments'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Upload, FileText, ImageIcon, X } from 'lucide-react'

interface FeedbackFormProps {
  submissionId: string
  assignmentId: string
  existingFeedback?: string | null
  existingFeedbackFileUrl?: string | null
  existingFeedbackFileType?: string | null
}

export function FeedbackForm({
  submissionId,
  assignmentId,
  existingFeedback,
  existingFeedbackFileUrl,
  existingFeedbackFileType,
}: FeedbackFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (!selected) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(selected.type)) {
      setError('JPEG・PNG・WebP・PDFのみアップロードできます')
      return
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください')
      return
    }
    setError(null)
    setFile(selected)
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    try {
      let fileUrl: string | null = null
      let fileType: string | null = null

      if (file) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('認証が必要です')

        const ext = file.name.split('.').pop()
        const path = `feedback/${submissionId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(path, file, { upsert: true })
        if (uploadError) throw new Error(uploadError.message)

        const { data: { publicUrl } } = supabase.storage.from('submissions').getPublicUrl(path)
        fileUrl = publicUrl
        fileType = file.type.startsWith('image/') ? 'image' : 'pdf'
      }

      formData.append('submission_id', submissionId)
      formData.append('assignment_id', assignmentId)
      if (fileUrl) formData.append('feedback_file_url', fileUrl)
      if (fileType) formData.append('feedback_file_type', fileType)

      const result = await saveFeedback(formData)
      if (result?.error) throw new Error(result.error)
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="feedback_comment">コメント（任意）</Label>
        <Textarea
          id="feedback_comment"
          name="feedback_comment"
          defaultValue={existingFeedback ?? ''}
          placeholder="生徒へのコメントを入力してください"
          rows={3}
        />
      </div>

      {/* ファイル添付 */}
      <div className="space-y-1">
        <Label>返却ファイル（任意）</Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
        {!file && !existingFeedbackFileUrl && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
            <p className="text-xs text-gray-500">クリックしてファイルを添付</p>
            <p className="text-xs text-gray-400">JPEG・PNG・WebP・PDF（最大10MB）</p>
          </button>
        )}
        {file && (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
            {file.type.startsWith('image/') ? (
              <ImageIcon className="h-6 w-6 text-indigo-500 shrink-0" />
            ) : (
              <FileText className="h-6 w-6 text-red-500 shrink-0" />
            )}
            <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = '' }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {/* 既存の返却ファイル */}
        {existingFeedbackFileUrl && !file && (
          <div className="flex items-center gap-2">
            <a
              href={existingFeedbackFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
            >
              {existingFeedbackFileType === 'image' ? (
                <ImageIcon className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              返却済みファイルを確認
            </a>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              差し替え
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
      )}
      {saved && (
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm">フィードバックを保存しました</p>
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? '保存中...' : existingFeedback || existingFeedbackFileUrl ? 'フィードバックを更新' : 'フィードバックを送る'}
      </Button>
    </form>
  )
}

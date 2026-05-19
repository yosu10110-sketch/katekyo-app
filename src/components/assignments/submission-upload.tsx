'use client'

import { useState, useRef } from 'react'
import { submitAssignment } from '@/app/actions/assignments'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Upload, FileText, ImageIcon, X } from 'lucide-react'

interface SubmissionUploadProps {
  assignmentId: string
}

export function SubmissionUpload({ assignmentId }: SubmissionUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('認証が必要です')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/${assignmentId}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(path, file, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(path)

      const formData = new FormData()
      formData.append('assignment_id', assignmentId)
      formData.append('file_url', publicUrl)
      formData.append('file_type', file.type.startsWith('image/') ? 'image' : 'pdf')

      const result = await submitAssignment(formData)
      if (result?.error) throw new Error(result.error)

      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
        <FileText className="h-5 w-5" />
        <p className="text-sm font-medium">提出しました。教師のフィードバックをお待ちください。</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">クリックしてファイルを選択</p>
          <p className="text-xs text-gray-400 mt-1">JPEG・PNG・WebP・PDF（最大10MB）</p>
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
          {file.type.startsWith('image/') ? (
            <ImageIcon className="h-8 w-8 text-indigo-500 shrink-0" />
          ) : (
            <FileText className="h-8 w-8 text-red-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = '' }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          ファイルを変更
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!file || uploading}
          onClick={handleUpload}
        >
          {uploading ? 'アップロード中...' : '提出する'}
        </Button>
      </div>
    </div>
  )
}

'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateProfile } from '@/app/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Camera, CheckCircle2 } from 'lucide-react'
import type { Profile } from '@/types'

const SUBJECTS = ['国語', '数学', '英語', '理科', '社会', '物理', '化学', '生物', '地理', '歴史', '音楽', '美術', '体育']

interface ProfileEditorProps {
  profile: Profile & { bio?: string; favorite_subjects?: string[]; hobbies?: string }
}

export function ProfileEditor({ profile }: ProfileEditorProps) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(profile.favorite_subjects ?? [])
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('5MB以下の画像にしてください'); return }

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`

    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) { alert('アップロードに失敗しました'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    setAvatarUrl(publicUrl)
    setUploading(false)
  }

  function toggleSubject(s: string) {
    setSelectedSubjects(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  async function handleSubmit(formData: FormData) {
    formData.set('avatar_url', avatarUrl)
    formData.set('favorite_subjects', selectedSubjects.join(','))
    startTransition(async () => {
      await updateProfile(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const roleLabel = profile.role === 'teacher' ? '教師' : profile.role === 'student' ? '生徒' : '保護者'

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* アバター */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md" />
          ) : (
            <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-3xl font-bold border-4 border-white shadow-md">
              {profile.full_name[0]}
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-1.5 shadow hover:bg-indigo-700 transition-colors"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        {uploading && <p className="text-xs text-gray-400">アップロード中...</p>}
        <div className="text-center">
          <p className="font-bold text-gray-900">{profile.full_name}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            profile.role === 'teacher' ? 'bg-indigo-100 text-indigo-700' :
            profile.role === 'student' ? 'bg-green-100 text-green-700' :
            'bg-amber-100 text-amber-700'
          }`}>{roleLabel}</span>
          {(profile as any).grade && (
            <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{(profile as any).grade}</span>
          )}
        </div>
      </div>

      {/* 自己紹介 */}
      <div className="space-y-1">
        <Label htmlFor="bio">自己紹介</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={(profile as any).bio ?? ''}
          placeholder="自己紹介を書いてください"
          rows={3}
        />
      </div>

      {/* 好きな教科 */}
      <div className="space-y-2">
        <Label>好きな教科（複数選択可）</Label>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSubject(s)}
              className={`px-3 py-1.5 rounded-full text-sm border-2 transition-colors ${
                selectedSubjects.includes(s)
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 趣味・好きなこと */}
      <div className="space-y-1">
        <Label htmlFor="hobbies">趣味・好きなこと</Label>
        <Input
          id="hobbies"
          name="hobbies"
          defaultValue={(profile as any).hobbies ?? ''}
          placeholder="例：サッカー、読書、ゲーム"
        />
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm">保存しました</p>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending || uploading}>
        {isPending ? '保存中...' : 'プロフィールを保存'}
      </Button>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Users, Search, UserPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  searchProfiles,
  addTeacherStudentRelationship,
  addParentStudentRelationship,
  removeTeacherStudentRelationship,
  removeParentStudentRelationship,
  getMyRelationships,
} from '@/app/actions/relationships'
import { useEffect } from 'react'

type SimpleProfile = { id: string; full_name: string; role: string }

export default function RelationshipsPage() {
  const [searchName, setSearchName] = useState('')
  const [searchResults, setSearchResults] = useState<SimpleProfile[]>([])
  const [relationships, setRelationships] = useState<any>(null)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    loadRelationships()
  }, [])

  async function loadRelationships() {
    const result = await getMyRelationships()
    setRelationships(result)
  }

  async function handleSearch() {
    if (!searchName.trim()) return
    const role = relationships?.role === 'parent' ? 'student' : 'student'
    const result = await searchProfiles(searchName, role)
    if (result.data) setSearchResults(result.data as SimpleProfile[])
  }

  async function handleAdd(targetId: string) {
    startTransition(async () => {
      setMessage(null)
      const result = relationships?.role === 'teacher'
        ? await addTeacherStudentRelationship(targetId)
        : await addParentStudentRelationship(targetId)

      if ('error' in result) {
        setMessage({ type: 'error', text: result.error ?? 'エラーが発生しました' })
      } else {
        setMessage({ type: 'success', text: '追加しました' })
        setSearchResults([])
        setSearchName('')
        await loadRelationships()
      }
    })
  }

  async function handleRemove(targetId: string) {
    startTransition(async () => {
      setMessage(null)
      const result = relationships?.role === 'teacher'
        ? await removeTeacherStudentRelationship(targetId)
        : await removeParentStudentRelationship(targetId)

      if ('error' in result) {
        setMessage({ type: 'error', text: result.error ?? 'エラーが発生しました' })
      } else {
        setMessage({ type: 'success', text: '削除しました' })
        await loadRelationships()
      }
    })
  }

  if (!relationships) {
    return <div className="text-center py-12 text-gray-400">読み込み中...</div>
  }

  const role = relationships.role

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          メンバー管理
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          {role === 'teacher' ? '担当生徒を追加・管理します' :
           role === 'parent' ? 'お子さんとの紐付けを管理します' :
           '担当教師・保護者を確認します'}
        </p>
      </div>

      {message && (
        <div className={`text-sm p-3 rounded-md ${
          message.type === 'error'
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* 生徒の場合：閲覧のみ */}
      {role === 'student' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">担当教師</CardTitle>
            </CardHeader>
            <CardContent>
              {relationships.teachers?.length === 0 ? (
                <p className="text-gray-400 text-sm">まだ教師が紐付けられていません</p>
              ) : (
                <ul className="space-y-2">
                  {relationships.teachers?.map((r: any) => (
                    <li key={r.teacher_id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold">
                        {r.profiles?.full_name?.[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{r.profiles?.full_name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">教師</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">保護者</CardTitle>
            </CardHeader>
            <CardContent>
              {relationships.parents?.length === 0 ? (
                <p className="text-gray-400 text-sm">まだ保護者が紐付けられていません</p>
              ) : (
                <ul className="space-y-2">
                  {relationships.parents?.map((r: any) => (
                    <li key={r.parent_id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-semibold">
                        {r.profiles?.full_name?.[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{r.profiles?.full_name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">保護者</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 教師・保護者：追加UI */}
      {(role === 'teacher' || role === 'parent') && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {role === 'teacher' ? '生徒を追加' : 'お子さんを追加'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="名前で検索..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {searchResults.length > 0 && (
                <ul className="space-y-2 border rounded-lg divide-y">
                  {searchResults.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 p-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-semibold">
                        {p.full_name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900 flex-1">{p.full_name}</span>
                      <Button
                        size="sm"
                        onClick={() => handleAdd(p.id)}
                        disabled={isPending}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        追加
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {searchResults.length === 0 && searchName && (
                <p className="text-sm text-gray-400">検索結果がありません</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {role === 'teacher' ? '担当生徒一覧' : '紐付け済みのお子さん'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relationships.data?.length === 0 ? (
                <p className="text-gray-400 text-sm">まだ誰も登録されていません</p>
              ) : (
                <ul className="space-y-2">
                  {relationships.data?.map((r: any) => {
                    const profile = r.profiles
                    const targetId = role === 'teacher' ? r.student_id : r.student_id
                    return (
                      <li key={targetId} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-semibold">
                          {profile?.full_name?.[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900 flex-1">{profile?.full_name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(targetId)}
                          disabled={isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

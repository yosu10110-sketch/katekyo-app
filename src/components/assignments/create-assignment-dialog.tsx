'use client'

import { useState, useTransition } from 'react'
import { createAssignment } from '@/app/actions/assignments'
import { createTextbook } from '@/app/actions/textbooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, BookMarked, ChevronDown, ChevronUp } from 'lucide-react'
import type { Profile, Textbook } from '@/types'
import { GRADES } from '@/types'

const SUBJECTS = ['国語', '数学', '英語', '理科', '社会', '物理', '化学', '生物', '地理', '歴史', 'その他']

interface CreateAssignmentDialogProps {
  students: Profile[]
  textbooks: Textbook[]
  preSelectedStudent?: Profile
}

export function CreateAssignmentDialog({ students, textbooks: initialTextbooks, preSelectedStudent }: CreateAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [textbooks, setTextbooks] = useState(initialTextbooks)
  const [selectedTextbookId, setSelectedTextbookId] = useState('')
  const [pageRange, setPageRange] = useState('')

  // 参考書インライン登録
  const [showAddTextbook, setShowAddTextbook] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newPublisher, setNewPublisher] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [addingTextbook, setAddingTextbook] = useState(false)

  const selectedTextbook = textbooks.find((t) => t.id === selectedTextbookId)
  const generatedTitle = selectedTextbook
    ? `${selectedTextbook.subject}『${selectedTextbook.title}』${pageRange ? ` p.${pageRange}` : ''}`
    : ''

  function handleClose() {
    setOpen(false)
    setError(null)
    setSelectedTextbookId('')
    setPageRange('')
    setShowAddTextbook(false)
    setNewSubject('')
    setNewTitle('')
    setNewPublisher('')
  }

  async function handleAddTextbook() {
    if (!newSubject || !newTitle) return
    setAddingTextbook(true)
    const fd = new FormData()
    fd.set('subject', newSubject)
    fd.set('title', newTitle)
    fd.set('publisher', newPublisher)
    if (newGrade) fd.set('grade', newGrade)
    // 生徒が確定している場合はその生徒に紐付ける
    if (preSelectedStudent) fd.set('student_id', preSelectedStudent.id)
    const result = await createTextbook(fd)
    setAddingTextbook(false)
    if ('error' in result) {
      setError(result.error ?? 'エラーが発生しました')
      return
    }
    // ローカルリストに追加して自動選択
    const tempId = crypto.randomUUID()
    const added: Textbook = {
      id: tempId,
      teacher_id: '',
      student_id: preSelectedStudent?.id ?? null,
      subject: newSubject,
      title: newTitle,
      publisher: newPublisher || null,
      grade: newGrade || null,
      created_at: new Date().toISOString(),
    }
    setTextbooks((prev) => [...prev, added])
    setSelectedTextbookId(tempId)
    setShowAddTextbook(false)
    setNewSubject('')
    setNewTitle('')
    setNewPublisher('')
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setError(null)
      if (generatedTitle) formData.set('title', generatedTitle)
      if (selectedTextbookId) formData.set('textbook_id', selectedTextbookId)
      if (pageRange) formData.set('page_range', pageRange)
      const result = await createAssignment(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        handleClose()
      }
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        課題を作成
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新しい課題を作成</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 mt-2">

            {/* 対象生徒 */}
            {preSelectedStudent ? (
              <>
                <input type="hidden" name="student_id" value={preSelectedStudent.id} />
                <div className="text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2 border border-gray-200">
                  対象：<span className="font-medium">{preSelectedStudent.full_name}</span>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="student_id">対象生徒</Label>
                <select
                  id="student_id"
                  name="student_id"
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">生徒を選択してください</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 参考書選択 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>参考書</Label>
                <button
                  type="button"
                  onClick={() => setShowAddTextbook((v) => !v)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <BookMarked className="h-3 w-3" />
                  参考書を登録
                  {showAddTextbook ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>

              {/* インライン参考書登録フォーム */}
              {showAddTextbook && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-indigo-700">新しい参考書を登録</p>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full rounded-md border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">科目を選択</option>
                    {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="書名（例：チャート式 数学II+B）"
                    className="bg-white"
                  />
                  <Input
                    value={newPublisher}
                    onChange={(e) => setNewPublisher(e.target.value)}
                    placeholder="出版社（任意）"
                    className="bg-white"
                  />
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full rounded-md border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">学年（任意）</option>
                    {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddTextbook}
                    disabled={!newSubject || !newTitle || addingTextbook}
                    className="w-full"
                  >
                    {addingTextbook ? '登録中...' : '登録して選択'}
                  </Button>
                </div>
              )}

              {textbooks.length > 0 && (
                <select
                  value={selectedTextbookId}
                  onChange={(e) => setSelectedTextbookId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">参考書を選択（任意）</option>
                  {textbooks.map((t) => (
                    <option key={t.id} value={t.id}>[{t.subject}] {t.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* ページ範囲 */}
            {selectedTextbookId && (
              <div className="space-y-1">
                <Label htmlFor="page_range">ページ範囲</Label>
                <Input
                  id="page_range"
                  value={pageRange}
                  onChange={(e) => setPageRange(e.target.value)}
                  placeholder="例：32〜35"
                />
              </div>
            )}

            {/* タイトル */}
            <div className="space-y-1">
              <Label htmlFor="title">
                課題タイトル
                {generatedTitle && <span className="text-xs text-gray-400 ml-1">（自動生成）</span>}
              </Label>
              <Input
                id="title"
                name="title"
                value={generatedTitle}
                readOnly={!!generatedTitle}
                placeholder="参考書未選択時は手動入力"
                required
                className={generatedTitle ? 'bg-gray-50 text-gray-600' : ''}
              />
            </div>

            {/* 説明 */}
            <div className="space-y-1">
              <Label htmlFor="description">内容・説明（任意）</Label>
              <Textarea id="description" name="description" placeholder="課題の詳細や注意点を入力" rows={3} />
            </div>

            {/* 提出期限 */}
            <div className="space-y-1">
              <Label htmlFor="due_date">提出期限（任意）</Label>
              <Input id="due_date" name="due_date" type="datetime-local" />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleClose}>キャンセル</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '作成中...' : '作成する'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { BookMarked, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createTextbook, deleteTextbook } from '@/app/actions/textbooks'
import type { Textbook } from '@/types'

const SUBJECTS = ['国語', '数学', '英語', '理科', '社会', '物理', '化学', '生物', '地理', '歴史', 'その他']

export function TextbookManager({ textbooks: initial }: { textbooks: Textbook[] }) {
  const [textbooks, setTextbooks] = useState(initial)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleCreate(formData: FormData) {
    startTransition(async () => {
      setError(null)
      const result = await createTextbook(formData)
      if ('error' in result) {
        setError(result.error ?? 'エラーが発生しました')
      } else {
        setOpen(false)
        // ページリロードでリストを更新
        window.location.reload()
      }
    })
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTextbook(id)
      setTextbooks((prev) => prev.filter((t) => t.id !== id))
    })
  }

  const grouped = SUBJECTS.reduce<Record<string, Textbook[]>>((acc, subject) => {
    const items = textbooks.filter((t) => t.subject === subject)
    if (items.length > 0) acc[subject] = items
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-600" />
            参考書管理
          </h2>
          <p className="text-gray-500 text-sm mt-1">課題作成時に使用する参考書を登録します</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          参考書を追加
        </Button>
      </div>

      {textbooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <BookMarked className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">まだ参考書が登録されていません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([subject, items]) => (
            <Card key={subject}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-indigo-600">{subject}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                      {t.publisher && (
                        <p className="text-xs text-gray-400">{t.publisher}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(t.id)}
                      disabled={isPending}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>参考書を追加</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="subject">科目</Label>
              <select
                id="subject"
                name="subject"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">科目を選択</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">書名</Label>
              <Input id="title" name="title" placeholder="例：チャート式 数学II+B" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="publisher">出版社（任意）</Label>
              <Input id="publisher" name="publisher" placeholder="例：数研出版" />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? '追加中...' : '追加する'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

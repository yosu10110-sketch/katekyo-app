'use client'

import { useState } from 'react'
import { createMaterial } from '@/app/actions/curriculum'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import type { Profile } from '@/types'

export function CreateMaterialDialog({ students }: { students: Profile[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    const result = await createMaterial(formData)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setOpen(false)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        教材を追加
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>教材を追加する</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="student_id">対象生徒</Label>
              <select
                id="student_id"
                name="student_id"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">生徒を選択</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="subject">科目</Label>
                <Input id="subject" name="subject" placeholder="例：数学" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="total_units">単元数</Label>
                <Input id="total_units" name="total_units" type="number" min="1" max="100" defaultValue="10" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">教材名</Label>
              <Input id="title" name="title" placeholder="例：中学数学 教科書 3年" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit_titles">
                単元名（1行1単元）
                <span className="text-gray-400 font-normal ml-1 text-xs">※単元数分だけ使われます</span>
              </Label>
              <Textarea
                id="unit_titles"
                name="unit_titles"
                placeholder={"第1章 式と計算\n第2章 平方根\n第3章 二次方程式\n..."}
                rows={5}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
              <Button type="submit" disabled={loading}>{loading ? '追加中...' : '追加する'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

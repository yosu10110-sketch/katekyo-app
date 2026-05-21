'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { searchProfiles, addTeacherStudentRelationship } from '@/app/actions/relationships'

export function AddStudentDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([])
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSearch() {
    if (!searchName.trim()) return
    const result = await searchProfiles(searchName, 'student')
    if (result.data) setResults(result.data as { id: string; full_name: string }[])
  }

  async function handleAdd(studentId: string, name: string) {
    startTransition(async () => {
      setMessage(null)
      const result = await addTeacherStudentRelationship(studentId)
      if ('error' in result) {
        setMessage({ type: 'error', text: result.error ?? 'エラーが発生しました' })
      } else {
        setMessage({ type: 'success', text: `${name} さんを追加しました` })
        setResults([])
        setSearchName('')
        router.refresh()
      }
    })
  }

  function handleClose() {
    setOpen(false)
    setSearchName('')
    setResults([])
    setMessage(null)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <UserPlus className="h-4 w-4" />
        生徒を追加
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>生徒を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Input
                placeholder="生徒の名前で検索..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {results.length > 0 && (
              <ul className="space-y-2 border rounded-lg divide-y">
                {results.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-3">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm font-semibold shrink-0">
                      {p.full_name[0]}
                    </div>
                    <span className="text-sm font-medium text-gray-900 flex-1">{p.full_name}</span>
                    <Button size="sm" onClick={() => handleAdd(p.id, p.full_name)} disabled={isPending}>
                      追加
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {message && (
              <p className={`text-sm p-3 rounded-md ${
                message.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {message.text}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

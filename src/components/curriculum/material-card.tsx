'use client'

import { useState, useRef } from 'react'
import { deleteMaterial, updateCurriculumImages, setCurrentPage as setCurrentPageAction } from '@/app/actions/curriculum'
import { Badge } from '@/components/ui/badge'
import { Trash2, Bookmark, Plus, ChevronDown, ChevronUp, ImagePlus, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CurriculumMaterial } from '@/types'

interface MaterialCardProps {
  material: CurriculumMaterial
  role: string
  studentName?: string
}

export function MaterialCard({ material, role, studentName }: MaterialCardProps) {
  const [localImages, setLocalImages] = useState<string[]>(material.images ?? [])
  const [localCurrentPage, setLocalCurrentPage] = useState(material.current_page ?? 0)
  const [expanded, setExpanded] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    e.target.value = ''

    setUploading(true)
    const supabase = createClient()
    const newImages = [...localImages]

    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `curriculum/${material.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('notice-board').upload(path, file)
      if (error) continue
      const { data: { publicUrl } } = supabase.storage.from('notice-board').getPublicUrl(path)
      newImages.push(publicUrl)
    }

    setLocalImages(newImages)
    await updateCurriculumImages(material.id, newImages)
    setUploading(false)
    setExpanded(true)
  }

  async function handleDeleteImage(index: number) {
    const newImages = localImages.filter((_, i) => i !== index)
    const newCurrentPage = localCurrentPage >= newImages.length
      ? Math.max(0, newImages.length - 1)
      : localCurrentPage

    setLocalImages(newImages)
    setLocalCurrentPage(newCurrentPage)
    await updateCurriculumImages(material.id, newImages)
    if (newCurrentPage !== localCurrentPage) {
      await setCurrentPageAction(material.id, newCurrentPage)
    }
  }

  async function handleSetCurrentPage(page: number) {
    setLocalCurrentPage(page)
    await setCurrentPageAction(material.id, page)
  }

  async function handleDelete() {
    if (!confirm('この教材を削除しますか？')) return
    setDeleted(true)
    const result = await deleteMaterial(material.id)
    if (result?.error) setDeleted(false)
  }

  if (deleted) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">{material.subject}</Badge>
              {studentName && <span className="text-xs text-gray-400">{studentName}</span>}
            </div>
            <h3 className="font-semibold text-gray-900">{material.title}</h3>
            {localImages.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Bookmark className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs text-indigo-600 font-medium">
                  {localCurrentPage + 1} / {localImages.length} ページ目まで学習済み
                </span>
              </div>
            )}
          </div>
          {role === 'teacher' && (
            <button
              onClick={handleDelete}
              className="text-gray-300 hover:text-red-500 transition-colors shrink-0 mt-0.5"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Empty state: teacher */}
      {role === 'teacher' && localImages.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-8 text-center">
          <ImagePlus className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-400 mb-3">テキストの写真をアップロードしてページビューアを作成できます</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            ページをアップロード
          </button>
        </div>
      )}

      {/* Empty state: non-teacher */}
      {role !== 'teacher' && localImages.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-6 text-center">
          <p className="text-sm text-gray-400">教材準備中...</p>
        </div>
      )}

      {/* Page viewer toggle */}
      {localImages.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 transition-colors"
          >
            <span>ページを{expanded ? '閉じる' : '見る'}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expanded && (
            <div className="divide-y divide-gray-100">
              {localImages.map((url, i) => (
                <div key={i}>
                  {/* Bookmark ribbon at current page */}
                  {i === localCurrentPage && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium">
                      <Bookmark className="h-3 w-3" />
                      <span>今ここまで学習済み</span>
                    </div>
                  )}

                  {/* Image */}
                  <div className={`relative ${i > localCurrentPage ? 'opacity-40' : ''}`}>
                    <img
                      src={url}
                      alt={`ページ ${i + 1}`}
                      className="w-full object-contain"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                      {i + 1}
                    </div>
                  </div>

                  {/* Teacher controls per page */}
                  {role === 'teacher' && (
                    <div className="flex items-center gap-3 px-3 py-2 bg-gray-50">
                      {i !== localCurrentPage ? (
                        <button
                          onClick={() => handleSetCurrentPage(i)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          <Bookmark className="h-3 w-3" />
                          しおりを立てる
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                          <Bookmark className="h-3 w-3 fill-current" />
                          現在のしおり
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteImage(i)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 ml-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                        削除
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add more pages (teacher) */}
              {role === 'teacher' && (
                <div className="p-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        アップロード中...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        ページを追加
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  )
}

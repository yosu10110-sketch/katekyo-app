'use client'

import { useState } from 'react'
import { login, signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setMessage(null)

    const result = mode === 'login' ? await login(formData) : await signup(formData)

    if (result && 'error' in result && result.error) {
      setMessage({ type: 'error', text: result.error })
    } else if (result && 'success' in result && result.success) {
      setMessage({ type: 'success', text: result.success })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-2xl mb-3">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">カテキョサポート</h1>
          <p className="text-gray-500 text-sm mt-1">家庭教師・生徒・保護者のためのアプリ</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'ログイン' : '新規登録'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'アカウントにログインしてください'
                : '新しいアカウントを作成します'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="full_name">氏名</Label>
                    <Input id="full_name" name="full_name" placeholder="山田 太郎" required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="role">ロール</Label>
                    <select
                      id="role"
                      name="role"
                      required
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="teacher">教師</option>
                      <option value="student">生徒</option>
                      <option value="parent">保護者</option>
                    </select>
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">メールアドレス</Label>
                <Input id="email" name="email" type="email" placeholder="example@email.com" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">パスワード</Label>
                <Input id="password" name="password" type="password" placeholder="6文字以上" required />
              </div>

              {message && (
                <div
                  className={`text-sm p-3 rounded-md ${
                    message.type === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  アカウントをお持ちでない方は{' '}
                  <button
                    onClick={() => { setMode('signup'); setMessage(null) }}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    新規登録
                  </button>
                </>
              ) : (
                <>
                  すでにアカウントをお持ちの方は{' '}
                  <button
                    onClick={() => { setMode('login'); setMessage(null) }}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    ログイン
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

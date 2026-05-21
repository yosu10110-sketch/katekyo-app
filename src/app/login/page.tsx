'use client'

import { useState } from 'react'
import { login, signup, signInWithGoogle } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

const ROLES = [
  { value: 'teacher', label: '教師' },
  { value: 'student', label: '生徒' },
  { value: 'parent', label: '保護者' },
]

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleRole, setGoogleRole] = useState('student')

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

  async function handleGoogleLogin() {
    setLoading(true)
    await signInWithGoogle(googleRole)
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
              {mode === 'login' ? 'アカウントにログインしてください' : '新しいアカウントを作成します'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Googleログイン */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>ロール</Label>
                <select
                  value={googleRole}
                  onChange={(e) => setGoogleRole(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-gray-200" />
              <span className="text-xs text-gray-400">またはメールで</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>

            {/* メール・パスワード */}
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
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
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
                <div className={`text-sm p-3 rounded-md ${
                  message.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {message.text}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '登録する'}
              </Button>
            </form>

            <div className="text-center text-sm text-gray-500">
              {mode === 'login' ? (
                <>アカウントをお持ちでない方は{' '}
                  <button onClick={() => { setMode('signup'); setMessage(null) }}
                    className="text-indigo-600 hover:underline font-medium">新規登録</button>
                </>
              ) : (
                <>すでにアカウントをお持ちの方は{' '}
                  <button onClick={() => { setMode('login'); setMessage(null) }}
                    className="text-indigo-600 hover:underline font-medium">ログイン</button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') // Google OAuth時にロールを受け取る
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 新規ユーザーのみロールを設定（既存ユーザーは変更しない）
      if (role && ['teacher', 'student', 'parent'].includes(role)) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, created_at')
            .eq('id', user.id)
            .single()
          // 作成から1分以内 = 新規ユーザー
          const isNewUser = profile &&
            (new Date().getTime() - new Date(profile.created_at).getTime()) < 60 * 1000
          if (isNewUser) {
            await supabase
              .from('profiles')
              .update({ role: role as 'teacher' | 'student' | 'parent' })
              .eq('id', user.id)
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}

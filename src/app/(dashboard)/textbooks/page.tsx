import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TextbookManager } from '@/components/textbooks/textbook-manager'
import type { Profile, Textbook } from '@/types'

export default async function TextbooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || (profile as Profile).role !== 'teacher') {
    redirect('/dashboard')
  }

  const { data: textbooks } = await supabase
    .from('textbooks')
    .select('*')
    .eq('teacher_id', user.id)
    .order('subject')

  return <TextbookManager textbooks={(textbooks ?? []) as Textbook[]} />
}

import { createClient } from '@/lib/supabase/server'
import { getUser, getProfile } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'
import { TextbookManager } from '@/components/textbooks/textbook-manager'
import type { Textbook } from '@/types'

export default async function TextbooksPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile || profile.role !== 'teacher') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const { data: textbooks } = await supabase
    .from('textbooks')
    .select('*')
    .eq('teacher_id', user.id)
    .order('subject')

  return <TextbookManager textbooks={(textbooks ?? []) as Textbook[]} />
}

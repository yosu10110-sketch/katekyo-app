'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '認証が必要です' }

  const updates: Record<string, unknown> = {
    bio: (formData.get('bio') as string) || null,
    hobbies: (formData.get('hobbies') as string) || null,
  }

  const favoriteSubjectsRaw = formData.get('favorite_subjects') as string
  if (favoriteSubjectsRaw) {
    updates.favorite_subjects = favoriteSubjectsRaw.split(',').map(s => s.trim()).filter(Boolean)
  } else {
    updates.favorite_subjects = []
  }

  const avatarUrl = formData.get('avatar_url') as string
  if (avatarUrl) updates.avatar_url = avatarUrl

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  revalidatePath('/', 'layout')
  return { success: true }
}

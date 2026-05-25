import { getUser, getProfile } from '@/lib/supabase/cached'
import { redirect } from 'next/navigation'
import { ProfileEditor } from '@/components/profile/profile-editor'

export default async function ProfilePage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(user.id)
  if (!profile) redirect('/login')

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-900 mb-6">プロフィール設定</h2>
      <ProfileEditor profile={profile} />
    </div>
  )
}

interface Badge {
  badge_id: string
  earned_at: string
  badges: { id: string; name: string; description: string; icon: string } | null
}

const ALL_BADGES = [
  { id: 'first_submit', name: '初提出',      icon: '📝', description: '初めて課題を提出した' },
  { id: 'streak_3',    name: '3連続達成',    icon: '🔥', description: '3回連続で締切前に提出した' },
  { id: 'streak_7',    name: '7連続達成',    icon: '⚡', description: '7回連続で締切前に提出した' },
  { id: 'streak_30',   name: '30連続達成',   icon: '🏆', description: '30回連続で締切前に提出した' },
  { id: 'perfect_week', name: '完璧な1週間', icon: '⭐', description: '1週間の課題をすべて締切前に提出した' },
  { id: 'early_bird',  name: '早起き提出',   icon: '🌅', description: '締切の1日以上前に提出した' },
]

interface BadgeCollectionProps {
  earnedBadges: Badge[]
}

export function BadgeCollection({ earnedBadges }: BadgeCollectionProps) {
  const earnedIds = new Set(earnedBadges.map(b => b.badge_id))

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        🏅 バッジコレクション
        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
          {earnedIds.size} / {ALL_BADGES.length}
        </span>
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {ALL_BADGES.map((badge) => {
          const isEarned = earnedIds.has(badge.id)
          const earnedAt = earnedBadges.find(b => b.badge_id === badge.id)?.earned_at
          return (
            <div
              key={badge.id}
              className={`rounded-xl p-3 text-center transition-all ${
                isEarned
                  ? 'bg-white border-2 border-indigo-200 shadow-sm'
                  : 'bg-gray-50 border border-gray-200 opacity-40'
              }`}
            >
              <div className={`text-2xl mb-1 ${!isEarned ? 'grayscale' : ''}`}>
                {isEarned ? badge.icon : '🔒'}
              </div>
              <p className="text-[10px] font-semibold text-gray-700 leading-tight">{badge.name}</p>
              {isEarned && earnedAt && (
                <p className="text-[9px] text-gray-400 mt-0.5">
                  {new Date(earnedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

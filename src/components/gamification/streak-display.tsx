import { Flame } from 'lucide-react'

interface StreakDisplayProps {
  current: number
  longest: number
}

export function StreakDisplay({ current, longest }: StreakDisplayProps) {
  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-4">
      <div className="relative">
        <div className={`text-4xl ${current > 0 ? 'animate-pulse' : 'opacity-30'}`}>🔥</div>
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-orange-600">{current}</span>
          <span className="text-sm font-medium text-orange-500">日連続</span>
        </div>
        <p className="text-xs text-orange-400 mt-0.5">
          {current === 0
            ? '次の課題を期限前に出してストリーク開始！'
            : `過去最高: ${longest}日連続`}
        </p>
      </div>
      {current >= 3 && (
        <div className="text-right">
          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-full font-medium">
            {current >= 30 ? '🏆 伝説' : current >= 7 ? '⚡ 絶好調' : '🔥 継続中'}
          </span>
        </div>
      )}
    </div>
  )
}

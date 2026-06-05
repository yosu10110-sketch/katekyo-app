export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <div className="h-7 w-56 bg-gray-200 rounded" />
        <div className="h-4 w-36 bg-gray-100 rounded" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-100 rounded-xl shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-gray-200 rounded" />
              <div className="h-6 w-12 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

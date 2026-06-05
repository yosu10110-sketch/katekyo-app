export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-end">
        <div className="h-9 w-28 bg-gray-200 rounded-md" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 w-16 bg-gray-200 rounded-full" />
                <div className="h-5 w-40 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

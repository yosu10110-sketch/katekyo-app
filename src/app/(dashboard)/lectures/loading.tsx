export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-end">
        <div className="h-9 w-28 bg-gray-200 rounded-md" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-8 w-20 bg-gray-100 rounded-md" />
          </div>
          <div className="h-4 w-64 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex justify-end">
        <div className="h-9 w-28 bg-gray-200 rounded-md" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
          <div className="h-6 w-16 bg-gray-100 rounded-full" />
        </div>
      ))}
    </div>
  )
}

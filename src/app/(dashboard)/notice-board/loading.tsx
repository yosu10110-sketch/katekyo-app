export default function Loading() {
  return (
    <div className="space-y-4 max-w-2xl animate-pulse">
      <div className="flex justify-end">
        <div className="h-9 w-28 bg-gray-200 rounded-md" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 space-y-2">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-5 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-full bg-gray-100 rounded" />
            <div className="h-4 w-3/4 bg-gray-100 rounded" />
          </div>
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5">
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

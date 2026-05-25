export default function Loading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-gray-100 animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="h-36 bg-gray-100 rounded-xl animate-pulse" />
    </div>
  )
}

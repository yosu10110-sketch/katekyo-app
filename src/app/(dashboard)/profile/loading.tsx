export default function Loading() {
  return (
    <div className="max-w-lg space-y-6">
      <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      ))}
      <div className="h-10 w-24 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  )
}

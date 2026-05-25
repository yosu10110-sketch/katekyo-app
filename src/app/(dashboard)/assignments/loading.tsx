export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

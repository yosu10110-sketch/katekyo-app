export default function Loading() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

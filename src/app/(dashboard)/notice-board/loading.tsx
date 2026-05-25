export default function Loading() {
  return (
    <div className="space-y-4 max-w-2xl">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

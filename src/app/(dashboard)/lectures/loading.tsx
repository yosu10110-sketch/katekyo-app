export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="h-9 w-28 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      ))}
    </div>
  )
}

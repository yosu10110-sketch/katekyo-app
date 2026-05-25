export default function BillingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded" />
      <div className="h-14 bg-gray-100 rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="h-24 bg-gray-100 rounded-xl" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

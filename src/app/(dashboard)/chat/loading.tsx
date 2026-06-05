export default function Loading() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="w-64 border-r border-gray-200 bg-white p-3 space-y-2 shrink-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
            <div className="h-10 w-10 bg-gray-200 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 space-y-4">
          <div className="flex flex-row">
            <div className="h-10 w-48 bg-gray-200 rounded-2xl" />
          </div>
          <div className="flex flex-row-reverse">
            <div className="h-10 w-40 bg-indigo-100 rounded-2xl" />
          </div>
          <div className="flex flex-row">
            <div className="h-10 w-56 bg-gray-200 rounded-2xl" />
          </div>
        </div>
        <div className="border-t border-gray-200 bg-white p-3">
          <div className="h-9 w-full bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

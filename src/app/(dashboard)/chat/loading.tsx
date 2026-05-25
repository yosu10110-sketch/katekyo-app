export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-7rem)] md:rounded-xl md:border md:border-gray-200 overflow-hidden bg-white">
      <div className="w-full md:w-72 shrink-0 border-r border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="p-3 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="hidden md:flex flex-1 items-center justify-center">
        <div className="h-14 w-14 rounded-full bg-gray-100 animate-pulse" />
      </div>
    </div>
  )
}

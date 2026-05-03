export default function TiendaV2Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="flex gap-6">
            <div className="w-56 shrink-0 space-y-4">
              <div className="h-6 w-24 bg-gray-200 rounded" />
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-5 w-full bg-gray-100 rounded" />
              ))}
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 space-y-3">
                    <div className="h-32 bg-gray-100 rounded-lg" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-50 rounded w-1/2" />
                    <div className="h-5 bg-gray-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

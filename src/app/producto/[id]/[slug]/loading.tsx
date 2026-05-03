export default function ProductoLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1440px] mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="space-y-4">
              <div className="h-96 bg-gray-200 rounded-2xl" />
              <div className="flex gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 w-20 bg-gray-100 rounded-lg" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-5 bg-gray-100 rounded w-1/3" />
              <div className="h-10 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
              <div className="h-4 bg-gray-100 rounded w-2/3" />
              <div className="h-12 bg-gray-200 rounded-xl w-48 mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

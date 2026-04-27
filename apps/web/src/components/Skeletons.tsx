export function ProductCardSkeleton() {
  return (
    <div className="card p-2 animate-pulse">
      <div className="aspect-square w-full bg-gray-200 rounded" />
      <div className="h-3 bg-gray-200 rounded mt-2 w-3/4" />
      <div className="h-3 bg-gray-200 rounded mt-1 w-1/2" />
      <div className="h-4 bg-gray-200 rounded mt-2 w-1/3" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="w-full h-56 sm:h-72 md:h-80 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
    </div>
  );
}

export function CategoryRailSkeleton() {
  return (
    <div className="card p-4">
      <div className="h-4 bg-gray-200 rounded w-32 mb-3 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 min-w-[88px]">
            <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

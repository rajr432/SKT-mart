export function ProductCardSkeleton() {
  return (
    <div className="card-premium p-2">
      <div className="aspect-square w-full skeleton-shimmer rounded-3xl" />
      <div className="skeleton-line mt-3 w-3/4" />
      <div className="skeleton-line mt-2 w-1/2" />
      <div className="skeleton-line mt-2 w-1/3 h-4" />
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
    <div className="rounded-3xl overflow-hidden">
      <div className="w-full h-56 sm:h-72 md:h-80 skeleton-shimmer rounded-3xl" />
    </div>
  );
}

export function CategoryRailSkeleton() {
  return (
    <div className="card-premium p-4">
      <div className="skeleton-line w-32 mb-4 h-4" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[88px]">
            <div className="h-16 w-16 rounded-full skeleton-shimmer" />
            <div className="skeleton-line w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

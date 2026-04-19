export default function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-3 animate-pulse">
          <div className="aspect-square bg-gray-200 rounded" />
          <div className="h-3 w-3/4 bg-gray-200 rounded mt-3" />
          <div className="h-3 w-1/2 bg-gray-200 rounded mt-2" />
          <div className="h-4 w-1/3 bg-gray-200 rounded mt-3" />
        </div>
      ))}
    </div>
  );
}

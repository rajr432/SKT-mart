export default function ProductLoading() {
  return (
    <div className="container-page py-4 grid md:grid-cols-2 gap-6 animate-pulse">
      <div className="aspect-square bg-gray-200 rounded-lg" />
      <div className="space-y-3">
        <div className="h-7 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-10 bg-gray-200 rounded w-1/2" />
        <div className="h-24 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

import { ProductGridSkeleton } from "@/components/Skeletons";

export default function CategoryLoading() {
  return (
    <div className="container-page py-4 space-y-4">
      <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
      <ProductGridSkeleton count={20} />
    </div>
  );
}

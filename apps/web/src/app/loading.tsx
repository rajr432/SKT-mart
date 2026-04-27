import {
  HeroSkeleton,
  CategoryRailSkeleton,
  ProductGridSkeleton,
} from "@/components/Skeletons";

export default function HomeLoading() {
  return (
    <div className="container-page py-4 space-y-4">
      <HeroSkeleton />
      <CategoryRailSkeleton />
      <div className="card p-4">
        <div className="h-5 bg-gray-200 rounded w-40 mb-3 animate-pulse" />
        <ProductGridSkeleton count={8} />
      </div>
      <div className="card p-4">
        <div className="h-5 bg-gray-200 rounded w-40 mb-3 animate-pulse" />
        <ProductGridSkeleton count={10} />
      </div>
    </div>
  );
}

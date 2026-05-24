import type { Metadata } from "next";
import { api, discountPercent, formatPaise } from "@/lib/api";
import type { Product } from "@/lib/types";
import { notFound } from "next/navigation";
import ProductActions from "./ProductActions";
import PincodeCheck from "./PincodeCheck";
import EmiCalculator from "./EmiCalculator";
import ReviewForm from "./ReviewForm";
import ProductCard from "@/components/ProductCard";
import TrustBadges from "@/components/TrustBadges";
import DeliveryEstimator from "@/components/DeliveryEstimator";
import SizeGuideButton from "@/components/SizeGuideButton";
import ProductAlerts from "@/components/ProductAlerts";
import ImageZoomGallery from "@/components/ImageZoomGallery";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import ShareSheet from "@/components/ShareSheet";
import ProductQA from "@/components/ProductQA";
import FrequentlyBoughtTogether from "@/components/FrequentlyBoughtTogether";
import RecentlyViewedTracker from "@/components/RecentlyViewedTracker";
import ProductVideo from "@/components/ProductVideo";

export const revalidate = 300;

// SEO metadata per product. Vendor-supplied metaTitle/metaDesc win; otherwise
// we fall back to the product name + a brand/price-rich description so the
// long tail still indexes well.
export async function generateMetadata(
  { params }: { params: { slug: string } },
): Promise<Metadata> {
  try {
    const { product } = await api<{ product: Product }>(`/api/products/${params.slug}`);
    const title = product.metaTitle || `${product.name}${product.brand ? ` – ${product.brand}` : ""}`;
    const description =
      product.metaDesc ||
      `${product.name} at ${formatPaise(product.price)} on SKT Mart. ${
        product.brand ? `Genuine ${product.brand}. ` : ""
      }Free 7-day returns. Fast India-wide delivery.`.slice(0, 160);
    const image = product.images[0]?.url;
    return {
      title,
      description,
      openGraph: { title, description, images: image ? [image] : [] },
      twitter: { card: "summary_large_image", title, description, images: image ? [image] : [] },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const data = await api<{ product: Product }>(`/api/products/${params.slug}`).catch(() => null);
  if (!data) notFound();
  const product = data.product;
  const related = await api<{ items: Product[] }>(`/api/products/${params.slug}/related`).catch(
    () => ({ items: [] }),
  );

  const off = discountPercent(product.mrp, product.price);

  return (
    <div className="container-page py-4 space-y-4">
      <div className="card-premium p-5 sm:p-6 grid md:grid-cols-[minmax(0,1fr)_1.5fr] gap-6">
        <div>
          <ImageZoomGallery images={product.images} name={product.name} />
          <div className="mt-4">
            <ProductActions productId={product.id} inStock={product.stock > 0} />
          </div>
        </div>

        <div className="space-y-3">
          {product.brand && (
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">
              {product.brand}
            </p>
          )}
          <h1 className="font-display text-2xl sm:text-3xl tracking-tightest">{product.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {product.rating > 0 && (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium">
                {product.rating.toFixed(1)} ★
              </span>
            )}
            <span className="text-xs text-gray-500">
              {product.ratingCount} ratings
            </span>
            {product.fAssured && (
              <span className="text-[10px] uppercase tracking-wider bg-violet-50 text-accent border border-violet-200 px-2 py-0.5 rounded-full font-medium">
                Assured
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3 pt-2">
            <span className="font-display text-3xl tracking-tightest">
              {formatPaise(product.price)}
            </span>
            {off > 0 && (
              <>
                <span className="text-sm text-gray-400 line-through">
                  {formatPaise(product.mrp)}
                </span>
                <span className="text-sm text-emerald-600 font-medium">{off}% off</span>
              </>
            )}
          </div>
          {product.stock <= 0 && (
            <p className="text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-full text-xs font-medium inline-block">
              Out of stock
            </p>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full text-xs font-medium inline-block">
              Hurry — only {product.stock} left
            </p>
          )}

          <div className="pt-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-2">
              Available offers
            </p>
            <ul className="text-sm space-y-1.5 text-gray-700">
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>
                  Use code <b className="font-medium tracking-tight">WELCOME10</b> for 10% off your first order
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>10% off on Axis Bank Credit Card (T&amp;C apply)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">•</span>
                <span>Free delivery on orders above ₹499</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <DeliveryEstimator />
            <SizeGuideButton />
          </div>

          <ProductAlerts
            productId={product.id}
            currentPrice={product.price}
            inStock={product.stock > 0}
          />

          <PincodeCheck />

          <EmiCalculator principalPaise={product.price} />

          <TrustBadges />

          <div className="pt-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-2">
              Description
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
              {product.description}
            </p>
          </div>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 mb-2">
                Specifications
              </p>
              <table className="text-sm w-full">
                <tbody>
                  {Object.entries(product.specs).map(([k, v]) => (
                    <tr key={k} className="border-b border-gray-100">
                      <td className="py-2 text-gray-400 pr-4 capitalize w-1/3 text-xs uppercase tracking-wider">
                        {k}
                      </td>
                      <td className="py-2 tracking-tight">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {product.vendor && (
            <p className="text-xs text-gray-500 pt-2">
              Sold by{" "}
              <span className="text-accent font-medium tracking-tight">
                {product.vendor.storeName}
              </span>
            </p>
          )}

          <div className="pt-2">
            <ShareSheet
              title={product.name}
              url={
                (process.env.NEXT_PUBLIC_WEB_URL ?? "https://sktmart.vercel.app") +
                `/product/${product.slug}`
              }
            />
          </div>
        </div>
      </div>

      <RecentlyViewedTracker productId={product.id} productSlug={product.slug} />

      <ProductVideo url={product.videoUrl} />

      <FrequentlyBoughtTogether productId={product.id} />

      <ProductQA productId={product.id} />

      <ReviewForm productId={product.id} />

      {product.reviews && product.reviews.length > 0 && (
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Reviews</p>
          <h2 className="font-display text-lg tracking-tightest mb-4">Ratings &amp; reviews</h2>
          <div className="space-y-4">
            {product.reviews.map((r) => (
              <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-full font-medium">
                    {r.rating} ★
                  </span>
                  <span className="font-medium tracking-tight text-sm">{r.title ?? ""}</span>
                  {r.verified && (
                    <span className="text-[10px] uppercase tracking-wider bg-violet-50 text-accent border border-violet-200 px-2 py-0.5 rounded-full">
                      Verified buyer
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{r.comment}</p>
                {r.images && r.images.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {r.images.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="h-16 w-16 object-cover rounded-2xl border border-gray-100"
                      />
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-2">
                  {r.user?.name ?? "Anonymous"} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {related.items.length > 0 && (
        <div className="card-premium p-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400">Curated</p>
          <h2 className="font-display text-lg tracking-tightest mb-4">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {related.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      <StickyMobileCTA productId={product.id} price={product.price} inStock={product.stock > 0} />
    </div>
  );
}

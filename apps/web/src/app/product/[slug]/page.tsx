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

export const dynamic = "force-dynamic";

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
      <div className="card p-4 grid md:grid-cols-[minmax(0,1fr)_1.5fr] gap-6">
        <div>
          <ImageZoomGallery images={product.images} name={product.name} />
          <div className="mt-4">
            <ProductActions productId={product.id} inStock={product.stock > 0} />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-xl sm:text-2xl font-medium">{product.name}</h1>
          {product.brand && <p className="text-sm text-gray-600">Brand: {product.brand}</p>}
          <div className="flex items-center gap-2">
            {product.rating > 0 && (
              <span className="bg-brand-green text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
                {product.rating.toFixed(1)} ★
              </span>
            )}
            <span className="text-sm text-gray-600">
              {product.ratingCount} Ratings &amp; {product.ratingCount} Reviews
            </span>
            {product.fAssured && (
              <span className="text-xs bg-brand-yellow text-white px-2 py-0.5 rounded">
                F-Assured
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-semibold">{formatPaise(product.price)}</span>
            {off > 0 && (
              <>
                <span className="text-sm text-gray-500 line-through">
                  {formatPaise(product.mrp)}
                </span>
                <span className="text-sm text-brand-green font-semibold">{off}% off</span>
              </>
            )}
          </div>
          {product.price >= 49900 && (
            <div className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 inline-flex items-center gap-1">
              <span>ℹ️</span>
              <span>
                Platform commission <b>{formatPaise(Math.floor(product.price * 0.1))}</b> (10%)
                auto-deducted from seller — buyer pays listed price only.
              </span>
            </div>
          )}
          {product.stock <= 0 && (
            <p className="text-red-600 font-medium text-sm">Out of stock</p>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <p className="text-orange-600 font-medium text-sm">
              Hurry! Only {product.stock} left.
            </p>
          )}

          <div>
            <h3 className="font-medium text-gray-700 mt-4">Available Offers</h3>
            <ul className="text-sm mt-1 space-y-1 text-gray-700">
              <li>🏷️ Use code <b>WELCOME10</b> for 10% off your first order</li>
              <li>💳 10% off on Axis Bank Credit Card (T&amp;C apply)</li>
              <li>🚚 Free delivery on orders above ₹499</li>
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

          <div>
            <h3 className="font-medium text-gray-700 mt-4">Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line">{product.description}</p>
          </div>

          {product.specs && Object.keys(product.specs).length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mt-4">Specifications</h3>
              <table className="text-sm mt-1 w-full">
                <tbody>
                  {Object.entries(product.specs).map(([k, v]) => (
                    <tr key={k} className="border-b">
                      <td className="py-1 text-gray-500 pr-4 capitalize w-1/3">{k}</td>
                      <td className="py-1">{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {product.vendor && (
            <p className="text-sm text-gray-600 pt-2">
              Sold by <span className="text-brand font-medium">{product.vendor.storeName}</span>
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

      <ProductQA productId={product.id} />

      <ReviewForm productId={product.id} />

      {product.reviews && product.reviews.length > 0 && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">Ratings &amp; Reviews</h2>
          <div className="space-y-3">
            {product.reviews.map((r) => (
              <div key={r.id} className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-brand-green text-white text-xs px-1.5 py-0.5 rounded">
                    {r.rating} ★
                  </span>
                  <span className="font-medium text-sm">{r.title ?? ""}</span>
                  {r.verified && (
                    <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded">
                      Verified Buyer
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">{r.comment}</p>
                {r.images && r.images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {r.images.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="h-16 w-16 object-cover border rounded"
                      />
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {r.user?.name ?? "Anonymous"} · {new Date(r.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {related.items.length > 0 && (
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">You may also like</h2>
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

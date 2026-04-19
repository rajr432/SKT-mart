import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-12 md:py-20">
      <div className="max-w-xl mx-auto text-center card p-8 flip-in">
        <div className="text-7xl mb-3 float-y">🛒</div>
        <h1 className="text-4xl md:text-5xl font-bold shine-text">404</h1>
        <p className="text-lg font-medium mt-2">Page not found</p>
        <p className="text-gray-500 mt-2 text-sm">
          Ye page exist nahi karta ya hata diya gaya hai. Neeche ke options try karo.
        </p>
        <div className="grid grid-cols-2 gap-2 mt-6 text-sm">
          <Link href="/" className="card p-3 hover:border-brand">🏠 Home</Link>
          <Link href="/categories" className="card p-3 hover:border-brand">📦 Categories</Link>
          <Link href="/deals" className="card p-3 hover:border-brand">🔥 Deals</Link>
          <Link href="/account" className="card p-3 hover:border-brand">👤 My Account</Link>
          <Link href="/cart" className="card p-3 hover:border-brand">🛒 Cart</Link>
          <Link href="/orders" className="card p-3 hover:border-brand">📄 Orders</Link>
        </div>
        <Link href="/" className="btn-primary btn-3d inline-block mt-6 px-6">
          Continue shopping →
        </Link>
      </div>
    </div>
  );
}

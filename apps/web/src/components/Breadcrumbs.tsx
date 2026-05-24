import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-gray-500 flex flex-wrap items-center gap-1 mb-3">
      <Link href="/" className="hover:text-brand">Home</Link>
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <span>/</span>
          {c.href ? (
            <Link href={c.href} className="hover:text-brand truncate max-w-[180px]">{c.label}</Link>
          ) : (
            <span className="text-gray-900 truncate max-w-[220px]">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

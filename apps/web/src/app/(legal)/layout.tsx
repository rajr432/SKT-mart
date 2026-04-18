export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-8 max-w-4xl">
      <div className="card p-6 sm:p-10 prose prose-sm sm:prose max-w-none">{children}</div>
    </div>
  );
}

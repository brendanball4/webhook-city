import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-accent text-xl">⚡</span>
          <span>Webhook City</span>
        </Link>
        <span className="text-muted text-sm ml-2">
          real-time webhook &amp; log dashboard
        </span>
      </div>
    </header>
  );
}

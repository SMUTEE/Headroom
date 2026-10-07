import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <p className="text-metadata text-text-secondary">Headroom · product lab</p>
      <h1 className="mt-2 text-display">
        I build the product surfaces where business logic, money and AI judgment meet.
      </h1>
      <p className="mt-5 text-body text-text-secondary">
        Foundation is in place. Builds land here as they ship.
      </p>
      <nav className="mt-8 flex gap-4">
        <Link
          href="/system"
          className="rounded-md bg-accent-solid px-4 py-2 text-label text-text-on-accent transition-colors hover:bg-accent-solid-hover"
        >
          Design system
        </Link>
      </nav>
    </main>
  );
}

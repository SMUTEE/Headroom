import Link from 'next/link';

/** The product mark. A shape rather than an image, so it themes with the system. */
export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      <span
        aria-hidden
        className="grid size-6 place-items-center rounded-md bg-accent-solid text-text-on-accent"
      >
        <span className="text-metadata font-semibold">H</span>
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-label text-text-primary">Headroom</span>
        {subtitle ? <span className="text-metadata text-text-disabled">{subtitle}</span> : null}
      </span>
    </Link>
  );
}

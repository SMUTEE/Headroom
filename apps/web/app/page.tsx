import Link from "next/link";
import { ThemeToggle } from "@headroom/ui";

const BUILDS = [
  {
    href: "/lab/monetisation",
    name: "Pricing & packaging",
    question: "If we change this price, what happens to the customers we already have?",
  },
  {
    href: "/lab/activation",
    name: "Activation",
    question: "Are new customers reaching value, or just finishing our checklist?",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
      <div className="flex items-start justify-between gap-6">
        <p className="text-metadata text-text-secondary">Headroom · product lab</p>
        <ThemeToggle />
      </div>

      <h1 className="mt-3 text-display">
        I build the product surfaces where business logic, money and AI judgment meet.
      </h1>
      <p className="mt-5 text-body text-text-secondary">
        A public lab working through monetisation, activation, account health, retention, billing
        and AI-assisted decisions in a realistic B2B SaaS environment. Every figure in it is
        synthetic and labelled as such.
      </p>

      <h2 className="mt-14 text-label text-text-secondary">Builds</h2>
      <ul className="mt-3 flex flex-col gap-px">
        {BUILDS.map((build) => (
          <li key={build.href}>
            <Link
              href={build.href}
              className="group flex gap-4 rounded-md border border-transparent px-3 py-4 transition-colors hover:border-border hover:bg-bg-surface"
            >
              <span className="min-w-0">
                <span className="block text-label text-text-primary group-hover:text-accent-text">
                  {build.name}
                </span>
                <span className="mt-1 block text-body-sm text-text-secondary">
                  {build.question}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-label text-text-secondary">System</h2>
      <Link
        href="/system"
        className="mt-3 flex gap-4 rounded-md border border-transparent px-3 py-4 transition-colors hover:border-border hover:bg-bg-surface"
      >
        <span className="min-w-0">
          <span className="block text-label text-text-primary">Design system</span>
          <span className="mt-1 block text-body-sm text-text-secondary">
            Generated colour ramps, contrast-measured in both appearances, shared by every build.
          </span>
        </span>
      </Link>
    </main>
  );
}

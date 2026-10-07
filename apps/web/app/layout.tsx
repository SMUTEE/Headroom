import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { themeScript } from "@headroom/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Headroom — a public product lab",
    template: "%s | Headroom",
  },
  description:
    "A working exploration of monetisation, activation, account health, retention, billing and AI-assisted decisions in a fictional B2B SaaS product. All data is synthetic.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      // themeScript sets data-theme before React hydrates, so the server
      // markup and the client intentionally disagree on this one element.
      // Without this, React reports a hydration mismatch on every page load.
      suppressHydrationWarning
    >
      <head>
        {/* Applies the stored appearance before first paint so a dark-mode
            visitor never sees a white flash. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg-page text-text-primary">
        {children}
      </body>
    </html>
  );
}

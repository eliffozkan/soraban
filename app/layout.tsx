import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SORABAN", template: "%s | SORABAN" },
  description: "ODTÜ hakkında günlük sayısal tahmin oyunu.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <a className="skip-link" href="#main-content">İçeriğe geç</a>
        <header className="border-b-2 border-ink">
          <nav aria-label="Ana menü" className="mx-auto flex max-w-6xl flex-wrap items-center gap-5 px-4 py-4 font-extrabold sm:px-8">
            <Link href="/" className="mr-auto">
              <Logo size={36} withWordmark />
            </Link>
            <Link href="/play">Oyna</Link>
            <Link href="/results">Sonuçlar</Link>
            <Link href="/leaderboard">Sıralama</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

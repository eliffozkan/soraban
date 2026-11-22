import type { Metadata } from "next";
import Link from "next/link";
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
        <header className="border-b border-neutral-200">
          <nav aria-label="Ana menü" className="mx-auto flex max-w-2xl flex-wrap gap-5 px-6 py-5">
            <Link href="/">SORABAN</Link>
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

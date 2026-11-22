import type { ReactNode } from "react";

/** Oyun sayfalarının ortak çerçevesi. `hideTitle` başlığı sadece ekran okuyucuya bırakır. */
export function GameMain({ title, hideTitle = false, children }: { title: string; hideTitle?: boolean; children: ReactNode }) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <h1 className={hideTitle ? "sr-only" : "display mb-6 text-4xl sm:text-5xl"}>{title}</h1>
      {children}
    </main>
  );
}

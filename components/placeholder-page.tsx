import type { ReactNode } from "react";

export function PlaceholderPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="mb-4 text-3xl font-semibold">{title}</h1>
      <div className="leading-relaxed">{children}</div>
    </main>
  );
}

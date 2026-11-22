"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";
import { cx } from "./cx";

export interface ShareButtonProps {
  /** Spoiler-free text prepared by the caller. */
  text: string;
  /** Does the actual share/copy (navigator.share, clipboard...). Throw or reject on failure. */
  onShare: (text: string) => void | Promise<void>;
  label?: string;
  copiedLabel?: string;
  failedLabel?: string;
  /** Show the text above the button. Default true. */
  showPreview?: boolean;
  className?: string;
}

/** Share/copy control with a short success or failure state. Holds only UI state. */
export function ShareButton({
  text,
  onShare,
  label = "Sonucu paylaş",
  copiedLabel = "Kopyalandı",
  failedLabel = "Paylaşılamadı, tekrar dene",
  showPreview = true,
  className,
}: ShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function handle() {
    if (timer.current) clearTimeout(timer.current);
    setStatus("busy");
    try {
      await onShare(text);
      setStatus("done");
    } catch {
      setStatus("failed");
    }
    timer.current = setTimeout(() => setStatus("idle"), 2500);
  }

  const shown = status === "done" ? copiedLabel : status === "failed" ? failedLabel : label;

  return (
    <div className={cx("space-y-3", className)}>
      {showPreview ? (
        <pre aria-label="Paylaşılacak metin" className="whitespace-pre-wrap rounded-md border-2 border-ink bg-paper p-4 font-sans font-bold">
          {text}
        </pre>
      ) : null}
      <Button variant={status === "failed" ? "secondary" : "primary"} onClick={handle} loading={status === "busy"} fullWidth>
        {shown}
      </Button>
      <p className="sr-only" aria-live="polite">
        {status === "done" ? copiedLabel : status === "failed" ? failedLabel : ""}
      </p>
    </div>
  );
}

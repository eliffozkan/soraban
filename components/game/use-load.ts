"use client";

import { useCallback, useEffect, useState } from "react";

export type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; error: unknown }
  | { status: "ready"; data: T };

/**
 * Ekran açılınca `load` çalıştırır; yükleniyor / hata / hazır durumunu ve
 * "Tekrar dene" için `retry` döndürür. `load` değişmemeli (bileşen dışında tanımla
 * ya da useCallback kullan).
 */
export function useLoad<T>(load: () => Promise<T>) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  useEffect(() => {
    let active = true;
    load().then(
      (data) => {
        if (active) setState({ status: "ready", data });
      },
      (error: unknown) => {
        if (active) setState({ status: "error", error });
      },
    );
    return () => {
      active = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  }, []);

  return { state, retry, setState };
}

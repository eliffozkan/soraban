"use client";

import { useId, useState, type FormEvent } from "react";
import { Button, Card, Notice } from "@/components/ui";
import {
  checkNickname,
  getSorabanClient,
  isSorabanClientError,
  NICKNAME_MAX_LENGTH,
  NICKNAME_PROBLEM_MESSAGES,
} from "@/lib/client";
import { errorMessage } from "./session";

/**
 * Takma ad girişi. Takma ad isteğe bağlıdır; gerçek ad istenmez.
 * Asıl kontrol (uygunsuz kelime filtresi dahil) sunucudadır.
 */
export function NicknameForm({
  initial,
  onDone,
  onSkip,
  onCancel,
}: {
  initial?: string | null;
  /** Kaydedilince sunucunun onayladığı ad ile çağrılır. */
  onDone: (nickname: string) => void;
  /** "Takma adsız devam et". Verilmezse düğme görünmez. */
  onSkip?: () => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [text, setText] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const check = checkNickname(text);
    if (!check.ok) {
      setError(NICKNAME_PROBLEM_MESSAGES[check.reason]);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await getSorabanClient().setNickname(check.value);
      onDone(saved.nickname ?? check.value);
    } catch (err) {
      if (isSorabanClientError(err) && err.code === "NICKNAME_REJECTED") {
        setError("Bu takma ad kullanılamıyor. Başka bir tane dene.");
      } else if (isSorabanClientError(err) && err.code === "NICKNAME_INVALID") {
        setError("Takma ad kurallara uymuyor. Harf, rakam, boşluk ve _ - . kullan.");
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card tone="paper" padding="lg" title="Sıralamada hangi adla görünmek istersin?" headingLevel={2}>
      <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
        <div>
          <label htmlFor={`${id}-nick`} className="eyebrow mb-2 block">
            Takma ad
          </label>
          <input
            id={`${id}-nick`}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            maxLength={NICKNAME_MAX_LENGTH + 10}
            autoComplete="nickname"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            className={`w-full rounded-md border-2 bg-surface px-5 py-4 text-xl font-bold shadow-hard-sm outline-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus ${error ? "border-pink" : "border-ink"}`}
          />
          <p id={`${id}-hint`} className="mt-2 text-sm font-medium text-ink-muted">
            3–{NICKNAME_MAX_LENGTH} karakter. Gerçek adını yazmak zorunda değilsin; herkes bu adı görecek.
          </p>
          {error ? (
            <p id={`${id}-error`} role="alert" className="mt-2 font-bold text-ink">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={saving}>
            Kaydet ve devam et
          </Button>
          {onSkip ? (
            <Button type="button" variant="secondary" size="lg" onClick={onSkip} disabled={saving}>
              Takma adsız devam et
            </Button>
          ) : null}
          {onCancel ? (
            <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={saving}>
              Vazgeç
            </Button>
          ) : null}
        </div>
        {onSkip ? (
          <Notice tone="info">Takma adsız oynarsan sıralamada otomatik bir ad görünür.</Notice>
        ) : null}
      </form>
    </Card>
  );
}

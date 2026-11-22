"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CategoryTag,
  CATEGORIES,
  ConfirmPanel,
  IconArrowRight,
  IconButton,
  IconClose,
  IconLock,
  Notice,
  NumericInput,
  Progress,
  RevealCard,
  StatusState,
  type ProgressState,
} from "@/components/ui";
import {
  getSorabanClient,
  isSorabanClientError,
  type DailyProgress,
  type QuestionPublic,
  type RevealedGuess,
} from "@/lib/client";
import { formatGuess, parseGuessInput, PARSE_ERROR_MESSAGES, readNumberTr } from "./number-input";
import { ratioCaption } from "./result-text";
import { ensureSessionOnce, errorMessage } from "./session";
import { useLoad } from "./use-load";

type PlayData = {
  questions: QuestionPublic[];
  revealed: Record<string, RevealedGuess>;
  progress: DailyProgress;
};

async function loadPlay(): Promise<PlayData> {
  await ensureSessionOnce();
  const client = getSorabanClient();
  const [today, mine] = await Promise.all([client.getToday(), client.getMyToday()]);
  const revealed: Record<string, RevealedGuess> = {};
  for (const guess of mine.guesses) revealed[guess.questionId] = guess;
  return { questions: today.questions, revealed, progress: today.progress };
}

const SHORTCUTS = [
  { label: "× bin", value: "bin" },
  { label: "× milyon", value: "milyon" },
  { label: "× milyar", value: "milyar" },
];

/** Soru ekranı: yükleme durumları, ardından oyun. */
export function PlayScreen() {
  const { state, retry } = useLoad(loadPlay);

  if (state.status === "loading") {
    return <StatusState kind="loading" title="Sorular yükleniyor…" />;
  }
  if (state.status === "error") {
    if (isSorabanClientError(state.error) && state.error.code === "DAY_UNAVAILABLE") {
      return (
        <StatusState
          kind="empty"
          title="Bugünün soruları henüz yayında değil"
          message="Biraz sonra tekrar uğra."
          action={<Button variant="secondary" onClick={retry}>Tekrar kontrol et</Button>}
        />
      );
    }
    return <StatusState kind="error" title="Sorular yüklenemedi" message={errorMessage(state.error)} onRetry={retry} />;
  }
  return <PlayGame initial={state.data} />;
}

type Phase = "input" | "confirm" | "submitting" | "revealed";

function firstOpenPosition(questions: QuestionPublic[], after = 0): number | null {
  const open = questions
    .filter((q) => q.state === "unanswered")
    .map((q) => q.position)
    .sort((a, b) => a - b);
  return open.find((p) => p > after) ?? open[0] ?? null;
}

function PlayGame({ initial }: { initial: PlayData }) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initial.questions);
  const [revealed, setRevealed] = useState(initial.revealed);
  const [progress, setProgress] = useState(initial.progress);
  const [position, setPosition] = useState<number | null>(() => firstOpenPosition(initial.questions));
  const [phase, setPhase] = useState<Phase>("input");
  const [text, setText] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [value, setValue] = useState<number | null>(null);
  const focusRef = useRef<HTMLDivElement>(null);

  const total = questions.length;
  const question = questions.find((q) => q.position === position) ?? null;
  const result = question ? revealed[question.id] : undefined;
  const view: Phase = result ? "revealed" : phase;

  // Aşama değişince ekran okuyucu ve klavye kullanıcısı yeni içeriğe taşınır.
  useEffect(() => {
    if (view !== "input") focusRef.current?.focus();
  }, [view, position]);

  const states: ProgressState[] = [...questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => q.state);
  const labels = [...questions]
    .sort((a, b) => a.position - b.position)
    .map((q) => (q.category ? CATEGORIES[q.category].shortLabel : undefined));

  function goTo(next: number | null) {
    setPosition(next);
    setPhase("input");
    setText("");
    setValue(null);
    setInputError(null);
    setSubmitError(null);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseGuessInput(text);
    if (!parsed.ok) {
      setInputError(PARSE_ERROR_MESSAGES[parsed.reason]);
      return;
    }
    setInputError(null);
    setValue(parsed.value);
    setPhase("confirm");
  }

  async function onConfirm() {
    if (!question || value === null || phase === "submitting") return;
    setPhase("submitting");
    setSubmitError(null);
    try {
      const response = await getSorabanClient().submitGuess({ questionId: question.id, guess: value });
      setRevealed((r) => ({ ...r, [question.id]: response.guess }));
      setQuestions((qs) => qs.map((q) => (q.id === question.id ? { ...q, state: "answered" } : q)));
      setProgress(response.progress);
      setPhase("revealed");
    } catch (error) {
      setSubmitError(errorMessage(error));
      setPhase("confirm");
    }
  }

  function onSelect(next: number) {
    const target = questions.find((q) => q.position === next);
    if (!target || target.state === "void" || phase === "submitting") return;
    goTo(next);
  }

  const nextOpen = firstOpenPosition(questions, position ?? 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Progress states={states} current={position ?? undefined} total={total} className="min-w-0" />
        <IconButton label="Ana sayfaya dön" icon={<IconClose size={22} />} onClick={() => router.push("/")} />
      </div>

      {!question ? (
        <StatusState
          kind="empty"
          title={progress.completed ? "Bugünün tüm sorularını cevapladın" : "Açık soru kalmadı"}
          message="Günün özetine bakabilirsin."
          action={<Button onClick={() => router.push("/results")}>Günün özeti</Button>}
        />
      ) : (
        <div ref={focusRef} tabIndex={-1} className="space-y-4 outline-none">
          {view === "revealed" && result ? (
            <>
              <RevealCard
                prompt={question.prompt}
                guess={result.guess}
                correctAnswer={result.correctAnswer}
                unit={question.unit}
                scoreRaw={result.scoreRaw}
                caption={ratioCaption(result.guess, result.correctAnswer)}
                reasoning={result.reasoning}
                sourceUrl={result.sourceUrl}
              />
              <div className="flex justify-end">
                {nextOpen !== null ? (
                  <Button size="lg" trailingIcon={<IconArrowRight size={28} />} onClick={() => goTo(nextOpen)}>
                    Sonraki soru
                  </Button>
                ) : (
                  <Button size="lg" trailingIcon={<IconArrowRight size={28} />} onClick={() => router.push("/results")}>
                    Günün özeti
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Card tone="yellow" padding="lg">
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow">
                  S{question.position} / {total}
                </span>
                {question.category ? <CategoryTag category={question.category} /> : null}
              </div>
              <h2 className="display mt-4 text-3xl text-balance sm:text-5xl">{question.prompt}</h2>

              {view === "input" ? (
                <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
                  <NumericInput
                    label="Tahminin"
                    value={text}
                    onChange={(next) => {
                      setText(next);
                      if (inputError) setInputError(null);
                    }}
                    unit={question.unit}
                    error={inputError ?? undefined}
                    hint="Örnek: 1.500 · 1,5 milyon · 2 bin"
                    shortcuts={SHORTCUTS}
                    onShortcut={(word) => setText((t) => `${t.trim()} ${word}`.trim())}
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                  <Button type="submit" size="lg" fullWidth leadingIcon={<IconLock size={26} />}>
                    Kilitle
                  </Button>
                  <p className="text-sm font-medium text-ink-muted">Her soruda tek hakkın var. Kilitlemeden önce sayını bir kez daha göstereceğiz.</p>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  {submitError ? (
                    <Notice tone="danger" title="Tahmin gönderilemedi">
                      {submitError}
                    </Notice>
                  ) : null}
                  <ConfirmPanel
                    formattedValue={value === null ? "" : formatGuess(value)}
                    spokenValue={value === null ? undefined : readNumberTr(value)}
                    unit={question.unit}
                    loading={view === "submitting"}
                    onConfirm={onConfirm}
                    onEdit={() => {
                      setPhase("input");
                      setSubmitError(null);
                    }}
                  />
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium text-ink-muted">
          {progress.answeredCount} soru cevaplandı
        </p>
        <Progress
          states={states}
          current={position ?? undefined}
          total={total}
          variant="chips"
          labels={labels}
          onSelect={onSelect}
          label="Sorular arasında geç"
        />
      </div>
    </div>
  );
}

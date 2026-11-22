import type { ReactNode } from "react";
import { cx } from "./cx";
import { StatusState } from "./status-state";

export interface LeaderboardEntry {
  /** Rank computed by the server; equal scores share a rank. */
  rank: number;
  nickname: string;
  scoreRaw: number;
  playedDays?: number;
}

export interface LeaderboardTableProps {
  entries: readonly LeaderboardEntry[];
  /** Rows with this rank are highlighted (e.g. the viewer's). */
  highlightRank?: number;
  /** Decimals for the score column. Default 1. */
  fractionDigits?: 0 | 1;
  caption?: ReactNode;
  emptyTitle?: ReactNode;
  emptyMessage?: ReactNode;
  className?: string;
}

const podium: Record<number, string> = { 1: "bg-yellow", 2: "bg-paper", 3: "bg-pink" };

export function LeaderboardTable({
  entries,
  highlightRank,
  fractionDigits = 1,
  caption = "Sıralama",
  emptyTitle = "Sıralama henüz açılmadı",
  emptyMessage = "Takma adlar onaylandığında burada görünecek.",
  className,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className={cx("rounded-lg border-2 border-ink bg-paper", className)}>
        <StatusState kind="empty" title={emptyTitle} message={emptyMessage} />
      </div>
    );
  }
  const fmt = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
  const withDays = entries.some((e) => typeof e.playedDays === "number");

  return (
    <div className={cx("overflow-hidden rounded-lg border-2 border-ink bg-paper shadow-hard-sm", className)}>
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b-2 border-ink">
            <th scope="col" className="eyebrow w-16 px-3 py-3 text-left">Sıra</th>
            <th scope="col" className="eyebrow px-3 py-3 text-left">Oyuncu</th>
            <th scope="col" className="eyebrow px-3 py-3 text-right">Puan</th>
            {withDays ? <th scope="col" className="eyebrow hidden px-3 py-3 text-right sm:table-cell">Gün</th> : null}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const mine = highlightRank !== undefined && e.rank === highlightRank;
            return (
              <tr key={`${e.rank}-${i}`} className={cx("border-b-2 border-ink/15 last:border-b-0", mine && "bg-blue text-white")}>
                <td className="px-3 py-3">
                  <span
                    className={cx(
                      "inline-flex size-9 items-center justify-center rounded-full border-2 border-ink font-extrabold tabular-nums text-ink",
                      podium[e.rank] ?? "bg-transparent",
                      mine && !podium[e.rank] && "border-white text-white",
                    )}
                  >
                    {e.rank}
                  </span>
                </td>
                <td className="w-full max-w-0 px-3 py-3 font-bold">
                  <span className="block truncate" title={e.nickname}>{e.nickname}</span>
                </td>
                <td className="display px-3 py-3 text-right text-xl tabular-nums">{fmt.format(e.scoreRaw)}</td>
                {withDays ? (
                  <td className="hidden px-3 py-3 text-right font-bold tabular-nums sm:table-cell">{e.playedDays ?? "—"}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

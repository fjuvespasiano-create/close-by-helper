import type { RankingRow } from "./types";

export function sortByActivity(rows: RankingRow[]): RankingRow[] {
  return [...rows].sort((a, b) => b.activities_count - a.activities_count);
}

export function sortByAbsences(rows: RankingRow[]): RankingRow[] {
  return [...rows]
    .filter((r) => r.sessions_count > 0)
    .sort((a, b) => b.absences_count - a.absences_count);
}

export function sortByPresence(rows: RankingRow[]): RankingRow[] {
  return [...rows]
    .filter((r) => r.sessions_count > 0)
    .sort((a, b) => b.attendance_rate - a.attendance_rate);
}

export function topN<T>(rows: T[], n: number): T[] {
  return rows.slice(0, n);
}

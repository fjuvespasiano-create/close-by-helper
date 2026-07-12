import type { SearchState } from "./types";
import { DEFAULT_SEARCH } from "./constants";

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (!min && !max) return null;
  const c = currency === "USD" ? "US$" : "R$";
  const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`);
  if (min && max) return `${c} ${fmt(min)}–${fmt(max)}`;
  return `${c} ${fmt((min ?? max)!)}`;
}

export function formatPostedDate(iso: string | null | undefined): string {
  if (!iso) return "Recente";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function parseSearchParams(s: Record<string, unknown>): SearchState {
  return {
    q: (s.q as string) || DEFAULT_SEARCH.q,
    city: (s.city as string) || DEFAULT_SEARCH.city,
    remote: ((s.remote as string) || DEFAULT_SEARCH.remote) as SearchState["remote"],
    employment: (s.employment as string) || DEFAULT_SEARCH.employment,
    experience: (s.experience as string) || DEFAULT_SEARCH.experience,
    salaryMin: Number(s.salaryMin) || DEFAULT_SEARCH.salaryMin,
    sort: ((s.sort as string) || DEFAULT_SEARCH.sort) as SearchState["sort"],
    page: Number(s.page) || DEFAULT_SEARCH.page,
  };
}

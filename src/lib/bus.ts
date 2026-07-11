import { supabase } from "@/integrations/supabase/client";

export type BusDeparture = {
  origin: string;
  day_type: string;
  times: string[];
};

export type BusLine = {
  id: string;
  code: string;
  name: string;
  slug: string;
  city_slug: string;
  operator: string | null;
  fare: number | null;
  source_url: string;
  departures: BusDeparture[];
  raw_updated_at: string | null;
  last_scraped_at: string;
};

export async function fetchBusLines(citySlug?: string): Promise<BusLine[]> {
  let q = supabase
    .from("bus_lines" as never)
    .select(
      "id, code, name, slug, city_slug, operator, fare, source_url, departures, raw_updated_at, last_scraped_at",
    )
    .order("code", { ascending: true });
  if (citySlug) q = q.eq("city_slug", citySlug);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as BusLine[];
}

export function findNextDepartures(line: BusLine, limit = 5): { origin: string; time: string }[] {
  const now = new Date();
  const day = now.getDay(); // 0 dom, 6 sab
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const preferredKeywords =
    day === 0 ? ["Domingo", "Feriado"] : day === 6 ? ["Sábado", "Sabado"] : ["Dia", "Útil", "Util"];

  const out: { origin: string; time: string; minutes: number }[] = [];
  for (const dep of line.departures) {
    const matches = preferredKeywords.some((k) => dep.day_type.includes(k));
    if (!matches) continue;
    for (const t of dep.times) {
      const [h, m] = t.split(":").map(Number);
      const minutes = h * 60 + m;
      if (minutes >= currentMinutes) {
        out.push({ origin: dep.origin, time: t, minutes });
      }
    }
  }
  out.sort((a, b) => a.minutes - b.minutes);
  return out.slice(0, limit).map(({ origin, time }) => ({ origin, time }));
}

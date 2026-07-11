import { supabase } from "@/integrations/supabase/client";
import type { CitySlug } from "@/hooks/useSelectedCity";

export type AgoraKind = "evento" | "promocao" | "vaga" | "edital" | "marketplace";

export type AgoraItem = {
  id: string;
  kind: AgoraKind;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  href: string;
  timestamp: string; // ISO — quando começa/foi publicado
  badge?: string | null;
  urgent?: boolean;
};

const CITY_IDS: Record<CitySlug, string> = {
  vespasiano: "c4ccc60b-b17c-4e91-968e-4d38ab42e734",
  "sao-jose-da-lapa": "d9203559-409c-4512-ae93-a5d398afe0b0",
};

const CITY_NAMES: Record<CitySlug, string> = {
  vespasiano: "Vespasiano",
  "sao-jose-da-lapa": "São José da Lapa",
};

function isoDaysAgo(n: number) {
  return new Date(Date.now() - n * 864e5).toISOString();
}
function isoDaysAhead(n: number) {
  return new Date(Date.now() + n * 864e5).toISOString();
}

export async function fetchAgoraFeed(citySlug: CitySlug, limit = 30): Promise<AgoraItem[]> {
  const cityId = CITY_IDS[citySlug];
  const cityName = CITY_NAMES[citySlug];
  const now = new Date().toISOString();
  const in7 = isoDaysAhead(7);
  const in48h = isoDaysAhead(2);
  const last3d = isoDaysAgo(3);
  const last24h = isoDaysAgo(1);

  const [events, promos, jobs, edits, listings] = await Promise.all([
    (supabase.from("events") as any)
      .select("id, slug, title, cover_image, start_at, location, city_id, status")
      .eq("status", "publicado")
      .eq("city_id", cityId)
      .gte("start_at", isoDaysAgo(0.5))
      .lte("start_at", in7)
      .order("start_at", { ascending: true })
      .limit(15),
    (supabase.from("promotions") as any)
      .select("id, slug, title, cover_image, valid_to, price_from, price_to, status, companies:company_id(city_id, name)")
      .eq("status", "ativa")
      .gte("valid_to", now)
      .lte("valid_to", in48h)
      .order("valid_to", { ascending: true })
      .limit(15),
    (supabase.from("jobs") as any)
      .select("id, title, company_name, location_city, apply_url, posted_at, is_active")
      .eq("is_active", true)
      .ilike("location_city", `%${cityName}%`)
      .gte("posted_at", last3d)
      .order("posted_at", { ascending: false })
      .limit(10),
    (supabase.from("procurements") as any)
      .select("id, title, agency, modality, deadline_date, source_url, city_id, status")
      .eq("city_id", cityId)
      .in("status", ["aberto", "publicado", "em_andamento"])
      .gte("deadline_date", now)
      .order("deadline_date", { ascending: true })
      .limit(10),
    (supabase.from("listings") as any)
      .select("id, slug, title, price, images, created_at, status, city_id")
      .eq("status", "ativo")
      .eq("city_id", cityId)
      .gte("created_at", last24h)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const items: AgoraItem[] = [];

  for (const e of events.data ?? []) {
    const start = new Date(e.start_at);
    const today = start.toDateString() === new Date().toDateString();
    items.push({
      id: `ev-${e.id}`,
      kind: "evento",
      title: e.title,
      subtitle: e.location ? `${e.location} · ${start.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : start.toLocaleString("pt-BR"),
      image: e.cover_image,
      href: `/eventos/${e.slug}`,
      timestamp: e.start_at,
      badge: today ? "Hoje" : "Em breve",
      urgent: today,
    });
  }

  for (const p of promos.data ?? []) {
    const cityOk = !p.companies?.city_id || p.companies.city_id === cityId;
    if (!cityOk) continue;
    const end = new Date(p.valid_to);
    const hoursLeft = Math.max(1, Math.round((end.getTime() - Date.now()) / 36e5));
    items.push({
      id: `pr-${p.id}`,
      kind: "promocao",
      title: p.title,
      subtitle: p.price_to ? `De R$ ${Number(p.price_from).toFixed(0)} por R$ ${Number(p.price_to).toFixed(0)}` : `${p.companies?.name ?? "Promoção ativa"}`,
      image: p.cover_image,
      href: `/promocoes`,
      timestamp: p.valid_to,
      badge: `Expira em ${hoursLeft}h`,
      urgent: hoursLeft <= 24,
    });
  }

  for (const j of jobs.data ?? []) {
    items.push({
      id: `jb-${j.id}`,
      kind: "vaga",
      title: j.title,
      subtitle: `${j.company_name ?? "Empresa"} · ${j.location_city ?? cityName}`,
      href: `/empregos/${j.id}`,
      timestamp: j.posted_at,
      badge: "Nova vaga",
    });
  }

  for (const e of edits.data ?? []) {
    const dl = new Date(e.deadline_date);
    const daysLeft = Math.max(1, Math.round((dl.getTime() - Date.now()) / 864e5));
    items.push({
      id: `ed-${e.id}`,
      kind: "edital",
      title: e.title,
      subtitle: `${e.agency ?? "Prefeitura"} · ${e.modality ?? "Edital"}`,
      href: `/transparencia`,
      timestamp: e.deadline_date,
      badge: `Prazo: ${daysLeft}d`,
      urgent: daysLeft <= 3,
    });
  }

  for (const l of listings.data ?? []) {
    const img = Array.isArray(l.images) ? l.images[0] : null;
    items.push({
      id: `ls-${l.id}`,
      kind: "marketplace",
      title: l.title,
      subtitle: l.price ? `R$ ${Number(l.price).toFixed(2).replace(".", ",")}` : "Consulte o vendedor",
      image: img,
      href: `/marketplace/${l.slug}`,
      timestamp: l.created_at,
      badge: "Novo",
    });
  }

  // Urgentes primeiro, depois por proximidade temporal
  items.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return items.slice(0, limit);
}

export const AGORA_KIND_META: Record<AgoraKind, { label: string; emoji: string; color: string }> = {
  evento: { label: "Evento", emoji: "🎉", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  promocao: { label: "Promoção", emoji: "🔥", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  vaga: { label: "Vaga", emoji: "💼", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  edital: { label: "Edital", emoji: "🏛️", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  marketplace: { label: "Marketplace", emoji: "🛒", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
};

/**
 * Job semanal: gera e envia resumo das atividades legislativas da semana
 * por cidade, para todos os assinantes ativos de WhatsApp.
 *
 * Disparado por pg_cron sextas às 15:00 UTC (12:00 BRT).
 * Depende do bot WhatsApp local expondo POST {WHATSAPP_BOT_URL} com
 * Authorization: Bearer {WHATSAPP_BOT_TOKEN}.
 */

type ActivityKind = string;

type Subscriber = {
  id: string;
  phone: string;
  name: string | null;
  city_id: string | null;
};

type Activity = {
  id: string;
  city_id: string;
  kind: ActivityKind;
  title: string;
  status: string | null;
  occurred_at: string;
  representative: { name: string; role: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  projeto_lei: "Projeto de Lei",
  indicacao: "Indicação",
  requerimento: "Requerimento",
  decreto: "Decreto",
  obra: "Obra",
  contrato: "Contrato",
  voto: "Voto",
  pauta: "Pauta",
  outro: "Ato",
};

function cityLabel(id: string, cities: Map<string, string>): string {
  return cities.get(id) ?? "sua cidade";
}

function citySlug(id: string, cities: Map<string, string>): string {
  const name = cityLabel(id, cities);
  return name === "Vespasiano" ? "vespasiano" : "sao-jose-da-lapa";
}

function buildDigest(name: string, cityName: string, acts: Activity[], baseUrl: string): string {
  if (!acts.length) {
    return (
      `Olá, ${name || "assinante"}! 📰\n\n` +
      `Esta semana não registramos novas atividades públicas em ${cityName}.\n\n` +
      `Assim que houver, você recebe aqui. Para cancelar: responda SAIR.`
    );
  }
  const top = acts.slice(0, 8);
  const lines = top.map((a) => {
    const kind = KIND_LABEL[a.kind] ?? "Ato";
    const who = a.representative ? ` — ${a.representative.name}` : "";
    return `• ${kind}: ${a.title.slice(0, 120)}${who}`;
  });
  const more = acts.length > top.length ? `\n\n+${acts.length - top.length} outras atualizações.` : "";
  return (
    `Olá, ${name || "assinante"}! 📰 Resumo da semana em ${cityName}:\n\n` +
    lines.join("\n") +
    more +
    `\n\nVer tudo: ${baseUrl}/representantes/feed` +
    `\n\nCancelar: responda SAIR.`
  );
}

async function sendMessage(phone: string, message: string, endpoint: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: phone, message }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[wpp-digest] send ${phone} falhou:`, err instanceof Error ? err.message : err);
    return false;
  }
}

export type DigestReport = {
  ok: boolean;
  subscribers: number;
  sent: number;
  failed: number;
  skipped_no_bot: boolean;
  per_city: Record<string, number>;
};

export async function runWeeklyDigest(): Promise<DigestReport> {
  const endpoint = process.env.WHATSAPP_BOT_URL;
  const token = process.env.WHATSAPP_BOT_TOKEN;
  const baseUrl = process.env.APP_BASE_URL ?? "https://project--1e2cacb3-db65-4c75-8803-dac2834a3207.lovable.app";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;

  const { data: cityRows } = await db.from("cities").select("id, name").in("slug", ["vespasiano", "sao-jose-da-lapa"]);
  const cities = new Map<string, string>(
    (cityRows ?? []).map((c: { id: string; name: string }) => [c.id, c.name]),
  );

  const sinceIso = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: acts } = await db
    .from("representative_activities")
    .select("id, city_id, kind, title, status, occurred_at, representative:representative_id (name, role)")
    .in("city_id", [...cities.keys()])
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: false });
  const byCity = new Map<string, Activity[]>();
  for (const a of (acts ?? []) as Activity[]) {
    const list = byCity.get(a.city_id) ?? [];
    list.push(a);
    byCity.set(a.city_id, list);
  }

  const { data: subs } = await db
    .from("whatsapp_subscribers")
    .select("id, phone, name, city_id")
    .eq("is_active", true);
  const subscribers = (subs ?? []) as Subscriber[];

  const report: DigestReport = {
    ok: true,
    subscribers: subscribers.length,
    sent: 0,
    failed: 0,
    skipped_no_bot: !endpoint || !token,
    per_city: {},
  };

  if (!endpoint || !token) {
    console.warn("[wpp-digest] bot não configurado — abortando envios");
    return report;
  }

  for (const s of subscribers) {
    if (!s.city_id) continue;
    const cName = cityLabel(s.city_id, cities);
    const cSlug = citySlug(s.city_id, cities);
    const msg = buildDigest(s.name ?? "", cName, byCity.get(s.city_id) ?? [], baseUrl);
    const ok = await sendMessage(s.phone, msg, endpoint, token);
    if (ok) {
      report.sent++;
      report.per_city[cSlug] = (report.per_city[cSlug] ?? 0) + 1;
      await db.from("whatsapp_subscribers").update({ last_sent_at: new Date().toISOString() }).eq("id", s.id);
    } else {
      report.failed++;
    }
    // pequeno jitter anti-ban
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 700));
  }

  return report;
}

export async function optOutByPhone(phoneRaw: string): Promise<{ ok: boolean; matched: boolean }> {
  const digits = phoneRaw.replace(/\D/g, "");
  if (digits.length < 10) return { ok: false, matched: false };
  const phone = digits.startsWith("55") ? `+${digits}` : `+55${digits}`;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("whatsapp_subscribers")
    .update({ is_active: false, opted_out_at: new Date().toISOString() })
    .eq("phone", phone)
    .select("id");
  if (error) throw error;
  return { ok: true, matched: (data?.length ?? 0) > 0 };
}

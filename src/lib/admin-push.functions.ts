import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Types ----------
const AudienceSchema = z.object({
  kind: z.enum([
    "all",           // qualquer usuário assinante
    "users",         // usuários sem empresa
    "companies",     // usuários com pelo menos uma empresa
    "premium",       // donos de empresa premium
    "free",          // donos de empresa gratuita
    "admins",        // administradores
    "city",          // filtrado por cidade
    "state",         // filtrado por estado
    "category",      // empresas da categoria
    "pwa",           // apenas usuários que instalaram PWA
    "recent30",      // usuários novos nos últimos 30 dias
    "inactive",      // sem login há 60+ dias
  ]).default("all"),
  city_id: z.string().uuid().nullish(),
  state: z.string().nullish(),
  category_id: z.string().uuid().nullish(),
});

const ButtonSchema = z.object({ label: z.string().min(1).max(24), url: z.string().url() });

const ComposeSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  icon_url: z.string().url().nullish(),
  image_url: z.string().url().nullish(),
  url: z.string().url().nullish(),
  category: z.string().default("geral"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  color: z.string().nullish(),
  emoji: z.string().nullish(),
  buttons: z.array(ButtonSchema).max(2).nullish(),
  audience: AudienceSchema,
  template_id: z.string().uuid().nullish(),
  scheduled_at: z.string().datetime().nullish(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

async function ensureAdmin(supabase: SB, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito.");
}

// ---------- Send now / schedule ----------
export const sendPushNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ComposeSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const scheduled = data.scheduled_at ? new Date(data.scheduled_at) : null;
    const isFuture = scheduled !== null && scheduled.getTime() > Date.now() + 30_000;

    const { data: notif, error: nErr } = await supabase
      .from("push_notifications")
      .insert({
        created_by: userId,
        template_id: data.template_id ?? null,
        title: data.title,
        body: data.body,
        icon_url: data.icon_url ?? null,
        image_url: data.image_url ?? null,
        url: data.url ?? null,
        category: data.category,
        priority: data.priority,
        color: data.color ?? null,
        emoji: data.emoji ?? null,
        buttons: data.buttons ?? null,
        audience: data.audience,
        status: isFuture ? "scheduled" : "sending",
        scheduled_at: isFuture ? scheduled!.toISOString() : null,
        sent_at: isFuture ? null : new Date().toISOString(),
      })
      .select("id")
      .single();
    if (nErr || !notif) throw new Error(nErr?.message ?? "Falha ao criar envio.");

    if (isFuture) {
      return { id: notif.id, scheduled: true, scheduled_at: scheduled!.toISOString() };
    }

    const { dispatchNotification } = await import("@/lib/push-dispatch.server");
    const res = await dispatchNotification(supabase, notif.id);
    return { id: notif.id, ...res };
  });



// ---------- List ----------
export const listAdminPush = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { data: rows, error } = await supabase
      .from("push_notifications")
      .select("id, title, body, category, status, sent_at, created_at, sent_count, delivered_count, opened_count, clicked_count, failed_count, audience")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getAdminPush = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { data: notif } = await supabase.from("push_notifications").select("*").eq("id", data.id).maybeSingle();
    if (!notif) throw new Error("Envio não encontrado.");
    const { data: deliveries } = await supabase
      .from("push_deliveries")
      .select("status, device, browser")
      .eq("notification_id", data.id);
    const byDevice: Record<string, number> = {};
    const byBrowser: Record<string, number> = {};
    (deliveries ?? []).forEach((d) => {
      const dev = d.device ?? "unknown";
      const br = d.browser ?? "unknown";
      byDevice[dev] = (byDevice[dev] ?? 0) + 1;
      byBrowser[br] = (byBrowser[br] ?? 0) + 1;
    });
    return { notification: notif, byDevice, byBrowser, totalDeliveries: deliveries?.length ?? 0 };
  });

export const deleteAdminPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);
    const { error } = await supabase.from("push_notifications").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Dashboard ----------
export const pushDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    const [subs, pwaSubs, companiesTotal, companiesPrem, companiesFree, notifs, lastSent, nextSched] = await Promise.all([
      supabase.from("push_subscriptions").select("user_id", { count: "exact", head: false }),
      supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("is_pwa", true),
      supabase.from("companies").select("id", { count: "exact", head: true }),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("plan", "premium"),
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("plan", "free"),
      supabase.from("push_notifications")
        .select("id, sent_at, sent_count, delivered_count, opened_count, clicked_count, failed_count, unsubscribed_count, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("push_notifications").select("id, title, sent_at").eq("status", "sent").order("sent_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("push_notifications").select("id, title, scheduled_at").eq("status", "scheduled").order("scheduled_at", { ascending: true }).limit(1).maybeSingle(),
    ]);

    const uniqueSubscribers = new Set((subs.data ?? []).map((s) => s.user_id as string)).size;
    const totals = (notifs.data ?? []).reduce((a, n) => ({
      sent: a.sent + (n.sent_count ?? 0),
      opened: a.opened + (n.opened_count ?? 0),
      clicked: a.clicked + (n.clicked_count ?? 0),
    }), { sent: 0, opened: 0, clicked: 0 });
    const openRate = totals.sent > 0 ? Math.round((totals.opened / totals.sent) * 1000) / 10 : 0;
    const clickRate = totals.sent > 0 ? Math.round((totals.clicked / totals.sent) * 1000) / 10 : 0;

    // Últimos 14 dias
    const days: Array<{ date: string; sent: number; clicked: number; failed: number; unsub: number }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, sent: 0, clicked: 0, failed: 0, unsub: 0 });
    }
    (notifs.data ?? []).forEach((n) => {
      const key = (n.sent_at ?? n.created_at ?? "").slice(0, 10);
      const day = days.find((d) => d.date === key);
      if (day) {
        day.sent += n.sent_count ?? 0;
        day.clicked += n.clicked_count ?? 0;
        day.failed += n.failed_count ?? 0;
        day.unsub += n.unsubscribed_count ?? 0;
      }
    });

    return {
      subscribers: uniqueSubscribers,
      subscriptions: subs.data?.length ?? 0,
      pwaInstalls: pwaSubs.count ?? 0,
      companies: companiesTotal.count ?? 0,
      premium: companiesPrem.count ?? 0,
      free: companiesFree.count ?? 0,
      openRate,
      clickRate,
      lastSent: lastSent.data ?? null,
      nextScheduled: nextSched.data ?? null,
      days,
    };
  });

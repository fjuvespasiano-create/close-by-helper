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
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

async function ensureAdmin(supabase: SB, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito.");
}

// ---------- Audience resolver: returns user_ids ----------
async function resolveAudience(
  supabase: SB,
  audience: z.infer<typeof AudienceSchema>,
): Promise<string[]> {
  const { data: subs } = await supabase.from("push_subscriptions").select("user_id");
  const subscriberIds = Array.from(new Set(((subs ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)));
  if (subscriberIds.length === 0) return [];

  const k = audience.kind;
  if (k === "all") return subscriberIds;

  if (k === "pwa") {
    const { data } = await supabase.from("push_subscriptions").select("user_id").eq("is_pwa", true);
    return Array.from(new Set(((data ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)));
  }

  if (k === "admins") {
    const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const ids = new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    return subscriberIds.filter((id) => ids.has(id));
  }

  if (k === "users" || k === "companies" || k === "premium" || k === "free" || k === "city" || k === "state" || k === "category") {
    let q = supabase.from("companies").select("owner_id, plan, city_id, cities(state), company_categories(category_id)").not("owner_id", "is", null);
    if (k === "premium") q = q.eq("plan", "premium");
    if (k === "free") q = q.eq("plan", "free");
    if (k === "city" && audience.city_id) q = q.eq("city_id", audience.city_id);
    const { data: companies } = await q;
    type CompanyRow = { owner_id: string | null; cities?: { state?: string } | null; company_categories?: Array<{ category_id?: string }> };
    const rows = (companies ?? []) as CompanyRow[];
    let owners = new Set<string>(rows.map((c) => c.owner_id).filter((v): v is string => !!v));

    if (k === "state" && audience.state) {
      owners = new Set(rows.filter((c) => c.cities?.state === audience.state).map((c) => c.owner_id!).filter(Boolean));
    }
    if (k === "category" && audience.category_id) {
      owners = new Set(
        rows
          .filter((c) => Array.isArray(c.company_categories) && c.company_categories.some((cc) => cc.category_id === audience.category_id))
          .map((c) => c.owner_id!).filter(Boolean),
      );
    }
    if (k === "users") {
      return subscriberIds.filter((id) => !owners.has(id));
    }
    return subscriberIds.filter((id) => owners.has(id));
  }

  if (k === "recent30") {
    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data } = await supabase.from("profiles").select("id, created_at").gte("created_at", cutoff);
    const ids = new Set(((data ?? []) as Array<{ id: string }>).map((p) => p.id));
    return subscriberIds.filter((id) => ids.has(id));
  }

  if (k === "inactive") {
    const cutoff = new Date(Date.now() - 60 * 86400_000).toISOString();
    const { data } = await supabase.from("push_subscriptions").select("user_id").lt("last_seen_at", cutoff);
    return Array.from(new Set(((data ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)));
  }

  return subscriberIds;
}

// ---------- Send now ----------
export const sendPushNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ComposeSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await ensureAdmin(supabase, userId);

    // 1. Cria o registro de envio
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
        status: "sending",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (nErr || !notif) throw new Error(nErr?.message ?? "Falha ao criar envio.");

    // 2. Resolve público
    const userIds = await resolveAudience(supabase, data.audience);
    if (userIds.length === 0) {
      await supabase.from("push_notifications").update({ status: "sent", sent_count: 0 }).eq("id", notif.id);
      return { id: notif.id, sent: 0 };
    }

    // 3. Puxa TODAS as inscrições ativas dos alvos
    const { data: targets } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth, user_agent")
      .in("user_id", userIds);

    if (!targets || targets.length === 0) {
      await supabase.from("push_notifications").update({ status: "sent", sent_count: 0 }).eq("id", notif.id);
      return { id: notif.id, sent: 0 };
    }

    // 4. Registra caixa de entrada (uma linha por usuário)
    const inboxRows = userIds.map((uid) => ({ user_id: uid, notification_id: notif.id }));
    await supabase.from("push_inbox").upsert(inboxRows, { onConflict: "user_id,notification_id", ignoreDuplicates: true });

    // 5. Cria linhas de delivery em batch
    const deliveryRows = targets.map((t) => ({
      notification_id: notif.id,
      user_id: t.user_id,
      subscription_id: t.id,
      status: "queued" as const,
    }));
    const { data: deliveries } = await supabase
      .from("push_deliveries")
      .upsert(deliveryRows, { onConflict: "notification_id,user_id,subscription_id", ignoreDuplicates: false })
      .select("id, subscription_id");
    const deliveryByEndpoint = new Map<string, number>();
    (deliveries ?? []).forEach((d) => {
      const t = targets.find((x) => x.id === d.subscription_id);
      if (t) deliveryByEndpoint.set(t.endpoint, d.id as number);
    });

    // 6. Dispara em paralelo, em lotes de 50
    const { sendWebPush, parseUA } = await import("@/lib/push-send.server");
    let sent = 0, failed = 0, unsubscribed = 0;
    const BATCH = 50;
    for (let i = 0; i < targets.length; i += BATCH) {
      const chunk = targets.slice(i, i + BATCH);
      await Promise.all(chunk.map(async (t) => {
        const deliveryId = deliveryByEndpoint.get(t.endpoint);
        const ua = parseUA(t.user_agent);
        const payload = {
          title: `${data.emoji ? data.emoji + " " : ""}${data.title}`,
          body: data.body,
          icon: data.icon_url ?? "/icons/icon-192.png",
          image: data.image_url ?? undefined,
          url: data.url ?? "/",
          buttons: data.buttons ?? undefined,
          notification_id: notif.id,
          delivery_id: deliveryId,
          category: data.category,
        };
        const res = await sendWebPush(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          payload,
          { urgency: data.priority === "high" ? "high" : data.priority === "low" ? "low" : "normal" },
        );
        if (res.ok) {
          sent += 1;
          if (deliveryId) {
            await supabase.from("push_deliveries").update({
              status: "sent", sent_at: new Date().toISOString(),
              device: ua.device, browser: ua.browser,
            }).eq("id", deliveryId);
          }
        } else {
          failed += 1;
          if (res.gone) {
            unsubscribed += 1;
            await supabase.from("push_subscriptions").delete().eq("id", t.id);
          }
          if (deliveryId) {
            await supabase.from("push_deliveries").update({
              status: res.gone ? "unsubscribed" : "failed",
              error: res.error.slice(0, 500),
              device: ua.device, browser: ua.browser,
            }).eq("id", deliveryId);
          }
        }
      }));
    }

    await supabase.from("push_notifications").update({
      status: "sent",
      sent_count: sent,
      failed_count: failed,
      unsubscribed_count: unsubscribed,
    }).eq("id", notif.id);

    return { id: notif.id, sent, failed, unsubscribed };
  });

// ---------- List ----------
export const listAdminPush = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(raw ?? {}))
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
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
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
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
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

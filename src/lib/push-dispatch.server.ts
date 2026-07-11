// Server-only: dispatcher compartilhado entre envio imediato, agendado e retry.
// Lê um push_notifications, resolve alvos (usando o snapshot em `audience`),
// envia, registra deliveries e atualiza contadores/status.

/* eslint-disable @typescript-eslint/no-explicit-any */
type SB = any;

type Audience = {
  kind: string;
  city_id?: string | null;
  state?: string | null;
  category_id?: string | null;
};

type NotifRow = {
  id: string;
  title: string;
  body: string;
  icon_url: string | null;
  image_url: string | null;
  url: string | null;
  category: string;
  priority: "low" | "normal" | "high";
  emoji: string | null;
  buttons: Array<{ label: string; url: string }> | null;
  audience: Audience;
};

const CATEGORY_PREF_MAP: Record<string, string | null> = {
  promocao: "promocoes",
  novidade: "novidades",
  evento: "eventos",
  empresa: "empresas",
  blog: "blog",
  marketplace: "marketplace",
  noticias: "novidades",
  sistema: null,
  manutencao: null,
  emergencia: null,
  geral: null,
};

export async function resolveAudienceUserIds(
  supabase: SB,
  audience: Audience,
): Promise<string[]> {
  const { data: subs } = await supabase.from("push_subscriptions").select("user_id");
  const subscriberIds = Array.from(
    new Set(((subs ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)),
  );
  if (subscriberIds.length === 0) return [];

  const k = audience.kind;
  if (k === "all") return subscriberIds;

  if (k === "pwa") {
    const { data } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .eq("is_pwa", true);
    return Array.from(new Set(((data ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)));
  }

  if (k === "admins") {
    const { data } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
    const ids = new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id));
    return subscriberIds.filter((id) => ids.has(id));
  }

  if (k === "recent30") {
    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data } = await supabase
      .from("profiles")
      .select("id, created_at")
      .gte("created_at", cutoff);
    const ids = new Set(((data ?? []) as Array<{ id: string }>).map((p) => p.id));
    return subscriberIds.filter((id) => ids.has(id));
  }

  if (k === "inactive") {
    const cutoff = new Date(Date.now() - 60 * 86400_000).toISOString();
    const { data } = await supabase
      .from("push_subscriptions")
      .select("user_id")
      .lt("last_seen_at", cutoff);
    return Array.from(new Set(((data ?? []) as Array<{ user_id: string }>).map((s) => s.user_id)));
  }

  // Segmentação por empresa / plano / categoria / cidade / estado
  if (["users", "companies", "premium", "free", "city", "state", "category"].includes(k)) {
    let q = supabase
      .from("companies")
      .select("owner_id, plan, city_id, cities(state), company_categories(category_id)")
      .not("owner_id", "is", null);
    if (k === "premium") q = q.eq("plan", "premium");
    if (k === "free") q = q.eq("plan", "free");
    if (k === "city" && audience.city_id) q = q.eq("city_id", audience.city_id);
    const { data: companies } = await q;
    type CompanyRow = {
      owner_id: string | null;
      cities?: { state?: string } | null;
      company_categories?: Array<{ category_id?: string }>;
    };
    const rows = (companies ?? []) as CompanyRow[];
    let owners = new Set<string>(rows.map((c) => c.owner_id).filter((v): v is string => !!v));

    if (k === "state" && audience.state) {
      owners = new Set(
        rows.filter((c) => c.cities?.state === audience.state).map((c) => c.owner_id!).filter(Boolean),
      );
    }
    if (k === "category" && audience.category_id) {
      owners = new Set(
        rows
          .filter(
            (c) =>
              Array.isArray(c.company_categories) &&
              c.company_categories.some((cc) => cc.category_id === audience.category_id),
          )
          .map((c) => c.owner_id!)
          .filter(Boolean),
      );
    }

    // H2: também considera profiles.city_id / profiles.state para usuários comuns.
    if (k === "city" && audience.city_id) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id")
        .eq("city_id", audience.city_id);
      ((profs ?? []) as Array<{ id: string }>).forEach((p) => owners.add(p.id));
    }
    if (k === "state" && audience.state) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id")
        .eq("state", audience.state);
      ((profs ?? []) as Array<{ id: string }>).forEach((p) => owners.add(p.id));
    }

    if (k === "users") return subscriberIds.filter((id) => !owners.has(id));
    return subscriberIds.filter((id) => owners.has(id));
  }

  return subscriberIds;
}

function filterByPreferences(
  userIds: string[],
  prefs: Array<Record<string, unknown>>,
  category: string,
  priority: string,
): string[] {
  const prefCol = CATEGORY_PREF_MAP[category] ?? null;
  if (prefCol === null) return userIds;
  const map = new Map<string, Record<string, unknown>>();
  prefs.forEach((p) => map.set(String(p.user_id), p));
  const hourUTC = new Date().getUTCHours();
  return userIds.filter((uid) => {
    const p = map.get(uid);
    if (!p) return true;
    if (p[prefCol] === false) return false;
    if (p.quiet_hours_enabled === true) {
      const s = Number(p.quiet_start ?? 0);
      const e = Number(p.quiet_end ?? 0);
      const inQuiet = s < e ? hourUTC >= s && hourUTC < e : hourUTC >= s || hourUTC < e;
      if (inQuiet && priority !== "high") return false;
    }
    return true;
  });
}

export async function dispatchNotification(
  supabase: SB,
  notificationId: string,
): Promise<{ sent: number; failed: number; unsubscribed: number; skipped?: boolean }> {
  const { data: notif } = await supabase
    .from("push_notifications")
    .select(
      "id, title, body, icon_url, image_url, url, category, priority, emoji, buttons, audience, status",
    )
    .eq("id", notificationId)
    .maybeSingle();
  if (!notif) return { sent: 0, failed: 0, unsubscribed: 0, skipped: true };
  const n = notif as NotifRow & { status: string };

  // Marca como enviando (evita duplicidade caso o scheduler rode em paralelo).
  await supabase
    .from("push_notifications")
    .update({ status: "sending", sent_at: new Date().toISOString() })
    .eq("id", n.id);

  let userIds = await resolveAudienceUserIds(supabase, n.audience);
  if (userIds.length > 0) {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select(
        "user_id, promocoes, novidades, eventos, atualizacoes, empresas, blog, marketplace, quiet_hours_enabled, quiet_start, quiet_end",
      )
      .in("user_id", userIds);
    userIds = filterByPreferences(userIds, prefs ?? [], n.category, n.priority);
  }

  if (userIds.length === 0) {
    await supabase
      .from("push_notifications")
      .update({ status: "sent", sent_count: 0 })
      .eq("id", n.id);
    return { sent: 0, failed: 0, unsubscribed: 0 };
  }

  const { data: targets } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, user_agent")
    .in("user_id", userIds);

  if (!targets || targets.length === 0) {
    await supabase
      .from("push_notifications")
      .update({ status: "sent", sent_count: 0 })
      .eq("id", n.id);
    return { sent: 0, failed: 0, unsubscribed: 0 };
  }

  const inboxRows = userIds.map((uid) => ({ user_id: uid, notification_id: n.id }));
  await supabase
    .from("push_inbox")
    .upsert(inboxRows, { onConflict: "user_id,notification_id", ignoreDuplicates: true });

  const deliveryRows = targets.map((t: any) => ({
    notification_id: n.id,
    user_id: t.user_id,
    subscription_id: t.id,
    status: "queued" as const,
  }));
  const { data: deliveries } = await supabase
    .from("push_deliveries")
    .upsert(deliveryRows, {
      onConflict: "notification_id,user_id,subscription_id",
      ignoreDuplicates: false,
    })
    .select("id, subscription_id");
  const deliveryByEndpoint = new Map<string, number>();
  (deliveries ?? []).forEach((d: any) => {
    const t = targets.find((x: any) => x.id === d.subscription_id);
    if (t) deliveryByEndpoint.set(t.endpoint, d.id as number);
  });

  const { sendWebPush, parseUA } = await import("@/lib/push-send.server");
  const { signDeliveryToken } = await import("@/lib/push-token.server");

  let sent = 0,
    failed = 0,
    unsubscribed = 0;
  const BATCH = 50;
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    await Promise.all(
      chunk.map(async (t: any) => {
        const deliveryId = deliveryByEndpoint.get(t.endpoint);
        const ua = parseUA(t.user_agent);
        const payload = {
          title: `${n.emoji ? n.emoji + " " : ""}${n.title}`,
          body: n.body,
          icon: n.icon_url ?? "/icons/icon-192.png",
          image: n.image_url ?? undefined,
          url: n.url ?? "/",
          buttons: n.buttons ?? undefined,
          notification_id: n.id,
          delivery_id: deliveryId,
          delivery_token: deliveryId ? signDeliveryToken(deliveryId) : undefined,
          category: n.category,
          priority: n.priority,
        };
        const res = await sendWebPush(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
          payload,
          { urgency: n.priority === "high" ? "high" : n.priority === "low" ? "low" : "normal" },
        );
        if (res.ok) {
          sent += 1;
          if (deliveryId) {
            await supabase
              .from("push_deliveries")
              .update({
                status: "sent",
                sent_at: new Date().toISOString(),
                device: ua.device,
                browser: ua.browser,
                next_retry_at: null,
              })
              .eq("id", deliveryId);
          }
        } else {
          failed += 1;
          if (res.gone) {
            unsubscribed += 1;
            await supabase.from("push_subscriptions").delete().eq("id", t.id);
          }
          if (deliveryId) {
            // Retry: só reagenda erros transitórios (5xx / 429 / rede).
            const transient = !res.gone && (res.status === 0 || res.status === 429 || res.status >= 500);
            const nextRetry = transient
              ? new Date(Date.now() + 5 * 60_000).toISOString()
              : null;
            await supabase
              .from("push_deliveries")
              .update({
                status: res.gone ? "unsubscribed" : "failed",
                error: res.error.slice(0, 500),
                device: ua.device,
                browser: ua.browser,
                next_retry_at: nextRetry,
              })
              .eq("id", deliveryId);
          }
          console.error("[push] send failed", {
            notification_id: n.id,
            delivery_id: deliveryId,
            status: res.status,
            error: res.error?.slice(0, 200),
          });
        }
      }),
    );
  }

  await supabase
    .from("push_notifications")
    .update({
      status: "sent",
      sent_count: sent,
      failed_count: failed,
      unsubscribed_count: unsubscribed,
    })
    .eq("id", n.id);

  return { sent, failed, unsubscribed };
}

// Reprocessa entregas com status='failed' e next_retry_at <= now(), até MAX_RETRIES.
export async function retryFailedDeliveries(
  supabase: SB,
  limit = 100,
  maxRetries = 3,
): Promise<{ retried: number; recovered: number; dropped: number }> {
  const nowIso = new Date().toISOString();
  const { data: rows } = await supabase
    .from("push_deliveries")
    .select(
      "id, notification_id, user_id, subscription_id, retry_count, push_subscriptions(id, endpoint, p256dh, auth, user_agent), push_notifications(id, title, body, icon_url, image_url, url, category, priority, emoji, buttons)",
    )
    .eq("status", "failed")
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", nowIso)
    .limit(limit);

  if (!rows || rows.length === 0) return { retried: 0, recovered: 0, dropped: 0 };

  const { sendWebPush, parseUA } = await import("@/lib/push-send.server");
  const { signDeliveryToken } = await import("@/lib/push-token.server");

  let retried = 0,
    recovered = 0,
    dropped = 0;

  await Promise.all(
    (rows as any[]).map(async (d) => {
      const sub = d.push_subscriptions;
      const n = d.push_notifications;
      if (!sub || !n) {
        await supabase
          .from("push_deliveries")
          .update({ next_retry_at: null, status: "failed" })
          .eq("id", d.id);
        dropped += 1;
        return;
      }
      if ((d.retry_count ?? 0) >= maxRetries) {
        await supabase
          .from("push_deliveries")
          .update({ next_retry_at: null })
          .eq("id", d.id);
        dropped += 1;
        return;
      }

      retried += 1;
      const ua = parseUA(sub.user_agent);
      const payload = {
        title: `${n.emoji ? n.emoji + " " : ""}${n.title}`,
        body: n.body,
        icon: n.icon_url ?? "/icons/icon-192.png",
        image: n.image_url ?? undefined,
        url: n.url ?? "/",
        buttons: n.buttons ?? undefined,
        notification_id: n.id,
        delivery_id: d.id,
        delivery_token: signDeliveryToken(d.id),
        category: n.category,
        priority: n.priority,
      };
      const res = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { urgency: n.priority === "high" ? "high" : n.priority === "low" ? "low" : "normal" },
      );
      const nextCount = (d.retry_count ?? 0) + 1;
      if (res.ok) {
        recovered += 1;
        await supabase
          .from("push_deliveries")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            device: ua.device,
            browser: ua.browser,
            retry_count: nextCount,
            next_retry_at: null,
            error: null,
          })
          .eq("id", d.id);
      } else {
        if (res.gone) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
        const transient =
          !res.gone && (res.status === 0 || res.status === 429 || res.status >= 500);
        const stillRetry = transient && nextCount < maxRetries;
        await supabase
          .from("push_deliveries")
          .update({
            status: res.gone ? "unsubscribed" : "failed",
            error: res.error.slice(0, 500),
            retry_count: nextCount,
            next_retry_at: stillRetry
              ? new Date(Date.now() + Math.pow(2, nextCount) * 5 * 60_000).toISOString()
              : null,
          })
          .eq("id", d.id);
        if (!stillRetry) dropped += 1;
      }
    }),
  );

  return { retried, recovered, dropped };
}

// Processa notificações agendadas com scheduled_at <= now().
export async function processScheduled(
  supabase: SB,
  limit = 20,
): Promise<{ processed: number; totals: { sent: number; failed: number } }> {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabase
    .from("push_notifications")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", nowIso)
    .limit(limit);

  if (!due || due.length === 0) return { processed: 0, totals: { sent: 0, failed: 0 } };

  let sent = 0,
    failed = 0;
  for (const row of due as Array<{ id: string }>) {
    try {
      const r = await dispatchNotification(supabase, row.id);
      sent += r.sent;
      failed += r.failed;
    } catch (e) {
      console.error("[push] scheduled dispatch error", row.id, (e as Error).message);
    }
  }
  return { processed: due.length, totals: { sent, failed } };
}

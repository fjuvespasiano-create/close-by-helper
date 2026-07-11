import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- Subscribe ----------
const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  user_agent: z.string().nullish(),
  platform: z.string().nullish(),
  is_pwa: z.boolean().default(false),
});

export const subscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SubscribeSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent ?? null,
        platform: data.platform ?? null,
        is_pwa: data.is_pwa,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ endpoint: z.string().url() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", data.endpoint);
    return { ok: true };
  });

// ---------- Preferences ----------
const PrefsSchema = z.object({
  promocoes: z.boolean().optional(),
  novidades: z.boolean().optional(),
  eventos: z.boolean().optional(),
  atualizacoes: z.boolean().optional(),
  empresas: z.boolean().optional(),
  blog: z.boolean().optional(),
  marketplace: z.boolean().optional(),
  som: z.boolean().optional(),
  vibracao: z.boolean().optional(),
  quiet_hours_enabled: z.boolean().optional(),
  quiet_start: z.number().int().min(0).max(23).optional(),
  quiet_end: z.number().int().min(0).max(23).optional(),
});

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", userId).maybeSingle();
    return data ?? null;
  });

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => PrefsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("notification_preferences").upsert(
      { user_id: userId, ...data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Inbox ----------
export const listMyInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      tab: z.enum(["all", "unread", "read", "favorites", "archived"]).default("all"),
      q: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("push_inbox")
      .select("id, received_at, read_at, favorite_at, archived_at, notification:push_notifications(id,title,body,icon_url,image_url,url,category,emoji,color,created_at)")
      .eq("user_id", userId)
      .order("received_at", { ascending: false })
      .limit(data.limit);

    if (data.tab === "unread") q = q.is("read_at", null).is("archived_at", null);
    if (data.tab === "read") q = q.not("read_at", "is", null).is("archived_at", null);
    if (data.tab === "favorites") q = q.not("favorite_at", "is", null);
    if (data.tab === "archived") q = q.not("archived_at", "is", null);
    else if (data.tab === "all") q = q.is("archived_at", null);

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let filtered = rows ?? [];
    if (data.q) {
      const t = data.q.toLowerCase();
      filtered = filtered.filter((r) => {
        const n = (r.notification as { title?: string; body?: string } | null);
        return n && ((n.title ?? "").toLowerCase().includes(t) || (n.body ?? "").toLowerCase().includes(t));
      });
    }
    return filtered;
  });

export const unreadInboxCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase
      .from("push_inbox")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null)
      .is("archived_at", null);
    return { count: count ?? 0 };
  });

const InboxActionSchema = z.object({ id: z.number().int(), action: z.enum(["read", "unread", "favorite", "unfavorite", "archive", "unarchive", "delete"]) });

export const inboxAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InboxActionSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date().toISOString();
    if (data.action === "delete") {
      const { error } = await supabase.from("push_inbox").delete().eq("id", data.id).eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const patch: { read_at?: string | null; favorite_at?: string | null; archived_at?: string | null } = {};
    if (data.action === "read") patch.read_at = now;
    if (data.action === "unread") patch.read_at = null;
    if (data.action === "favorite") patch.favorite_at = now;
    if (data.action === "unfavorite") patch.favorite_at = null;
    if (data.action === "archive") patch.archived_at = now;
    if (data.action === "unarchive") patch.archived_at = null;
    const { error } = await supabase.from("push_inbox").update(patch).eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_inbox")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

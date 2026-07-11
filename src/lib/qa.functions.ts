import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const TypeEnum = z.enum([
  "erro","bug","info_incorreta","empresa","evento","noticia","layout","lentidao","funcionalidade","sugestao","outro",
]);
const StatusEnum = z.enum([
  "novo","em_analise","reproduzido","em_desenvolvimento","corrigido","publicado","fechado",
]);
const PriorityEnum = z.enum(["baixa","media","alta","critica"]);

const CreateSchema = z.object({
  type: TypeEnum,
  description: z.string().trim().min(3).max(5000),
  page_url: z.string().url().max(2000).nullish(),
  page_title: z.string().max(300).nullish(),
  city_id: z.string().uuid().nullish(),
  device: z.record(z.string(), z.unknown()).default({}),
  console_logs: z.array(z.record(z.string(), z.unknown())).max(80).default([]),
  network_logs: z.array(z.record(z.string(), z.unknown())).max(60).default([]),
  screenshot_url: z.string().url().nullish(),
  video_url: z.string().url().nullish(),
  extra: z.record(z.string(), z.unknown()).default({}),
  user_name: z.string().max(120).nullish(),
  user_email: z.string().email().max(320).nullish(),
});

function serverClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function clientIp(): string | null {
  const req = getRequest();
  const h = req?.headers;
  if (!h) return null;
  const v =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return v || null;
}

function autoPriority(type: z.infer<typeof TypeEnum>): z.infer<typeof PriorityEnum> {
  if (type === "erro" || type === "bug") return "alta";
  if (type === "lentidao" || type === "funcionalidade") return "media";
  if (type === "sugestao") return "baixa";
  return "media";
}

function fingerprintOf(input: {
  type: string;
  page_url?: string | null;
  description: string;
  console_logs: unknown[];
}) {
  const firstErr = (input.console_logs as Array<{ message?: string }> | undefined)?.find(
    (l) => typeof l?.message === "string",
  )?.message;
  const base = [
    input.type,
    (input.page_url ?? "").replace(/\?.*$/, ""),
    firstErr ?? input.description.slice(0, 60),
  ].join("|").toLowerCase();
  let hash = 0;
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) | 0;
  return `fp_${(hash >>> 0).toString(36)}`;
}

// PUBLIC: qualquer visitante pode enviar (RLS já garante).
export const createQaTicket = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => CreateSchema.parse(raw))
  .handler(async ({ data }) => {
    const supabase = serverClient();
    const ip = clientIp();
    const fingerprint = fingerprintOf(data);
    const priority = autoPriority(data.type);

    const { data: row, error } = await supabase
      .from("qa_tickets")
      .insert({
        type: data.type,
        description: data.description,
        page_url: data.page_url ?? null,
        page_title: data.page_title ?? null,
        city_id: data.city_id ?? null,
        device: data.device as never,
        console_logs: data.console_logs as never,
        network_logs: data.network_logs as never,
        screenshot_url: data.screenshot_url ?? null,
        video_url: data.video_url ?? null,
        extra: data.extra as never,
        user_email: data.user_email ?? null,
        user_name: data.user_name ?? null,
        priority,
        fingerprint,
        ip,
      })
      .select("id, ticket_number")
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id, ticket_number: row.ticket_number };
  });

// -------- ADMIN --------
export const listQaTickets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: StatusEnum.nullish(),
        type: TypeEnum.nullish(),
        priority: PriorityEnum.nullish(),
        search: z.string().max(200).nullish(),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(raw ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    let q = supabase
      .from("qa_tickets")
      .select(
        "id, ticket_number, type, priority, status, description, page_url, page_title, user_name, user_email, device, screenshot_url, assigned_to, created_at, resolved_at, ip, city_id",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.type) q = q.eq("type", data.type);
    if (data.priority) q = q.eq("priority", data.priority);
    if (data.search) q = q.ilike("description", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    // stats
    const { data: statRows } = await supabase.from("qa_tickets").select("status, priority, created_at");
    const stats = {
      total: statRows?.length ?? 0,
      pendentes: statRows?.filter((r) => !["corrigido","publicado","fechado"].includes(r.status ?? "")).length ?? 0,
      resolvidos: statRows?.filter((r) => ["corrigido","publicado"].includes(r.status ?? "")).length ?? 0,
      criticos: statRows?.filter((r) => r.priority === "critica").length ?? 0,
      hoje: statRows?.filter((r) => new Date(r.created_at!).toDateString() === new Date().toDateString()).length ?? 0,
    };
    return { rows: rows ?? [], stats };
  });

export const getQaTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: ticket, error } = await supabase.from("qa_tickets").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const [{ data: comments }, { data: events }] = await Promise.all([
      supabase.from("qa_ticket_comments").select("*").eq("ticket_id", data.id).order("created_at"),
      supabase.from("qa_ticket_events").select("*").eq("ticket_id", data.id).order("created_at"),
    ]);
    let screenshotSignedUrl: string | null = null;
    if (ticket.screenshot_url) {
      try {
        const path = ticket.screenshot_url;
        const { data: signed } = await supabase.storage.from("qa-attachments").createSignedUrl(path, 3600);
        screenshotSignedUrl = signed?.signedUrl ?? null;
      } catch {
        screenshotSignedUrl = null;
      }
    }
    return { ticket, comments: comments ?? [], events: events ?? [], screenshotSignedUrl };
  });

export const updateQaTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: StatusEnum.nullish(),
        priority: PriorityEnum.nullish(),
        assigned_to: z.string().uuid().nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const patch: {
      status?: z.infer<typeof StatusEnum>;
      priority?: z.infer<typeof PriorityEnum>;
      assigned_to?: string | null;
    } = {};
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if (data.assigned_to !== undefined) patch.assigned_to = data.assigned_to;
    const { error } = await supabase.from("qa_tickets").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addQaComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ ticket_id: z.string().uuid(), body: z.string().trim().min(1).max(4000) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase
      .from("qa_ticket_comments")
      .insert({ ticket_id: data.ticket_id, author_id: userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

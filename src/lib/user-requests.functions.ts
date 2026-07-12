import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

const CategoryEnum = z.enum([
  "duvida",
  "sugestao",
  "parceria",
  "orcamento",
  "cadastro_empresa",
  "cadastro_evento",
  "imprensa",
  "elogio",
  "reclamacao",
  "outro",
]);
const StatusEnum = z.enum(["novo", "em_analise", "respondido", "resolvido", "arquivado"]);
const PriorityEnum = z.enum(["baixa", "media", "alta", "critica"]);

const CreateSchema = z.object({
  category: CategoryEnum.default("outro"),
  subject: z.string().trim().min(3).max(200),
  description: z.string().trim().min(5).max(5000),
  page_url: z.string().url().max(2000).nullish(),
  attachment_url: z.string().max(2000).nullish(),
  user_name: z.string().trim().max(120).nullish(),
  user_email: z.string().trim().email().max(320).nullish(),
  user_phone: z.string().trim().max(30).nullish(),
  city_id: z.string().uuid().nullish(),
  extra: z.record(z.string(), z.unknown()).default({}),
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
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

// PUBLIC: qualquer visitante pode enviar uma solicitação.
export const createUserRequest = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => CreateSchema.parse(raw))
  .handler(async ({ data }) => {
    const supabase = serverClient();
    const { data: row, error } = await supabase
      .from("user_requests")
      .insert({
        category: data.category,
        subject: data.subject,
        description: data.description,
        page_url: data.page_url ?? null,
        attachment_url: data.attachment_url ?? null,
        user_name: data.user_name ?? null,
        user_email: data.user_email ?? null,
        user_phone: data.user_phone ?? null,
        city_id: data.city_id ?? null,
        extra: data.extra as never,
        ip: clientIp(),
      })
      .select("id, request_number")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, request_number: row.request_number };
  });

// -------- ADMIN --------
export const listUserRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        status: StatusEnum.nullish(),
        category: CategoryEnum.nullish(),
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
      .from("user_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.category) q = q.eq("category", data.category);
    if (data.priority) q = q.eq("priority", data.priority);
    if (data.search) q = q.ilike("subject", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const [totalRes, novosRes, resolvidosRes, hojeRes] = await Promise.all([
      supabase.from("user_requests").select("*", { count: "exact", head: true }),
      supabase.from("user_requests").select("*", { count: "exact", head: true }).eq("status", "novo"),
      supabase.from("user_requests").select("*", { count: "exact", head: true }).eq("status", "resolvido"),
      supabase
        .from("user_requests")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);
    return {
      rows: rows ?? [],
      stats: {
        total: totalRes.count ?? 0,
        novos: novosRes.count ?? 0,
        resolvidos: resolvidosRes.count ?? 0,
        hoje: hojeRes.count ?? 0,
      },
    };
  });

export const updateUserRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: StatusEnum.nullish(),
        priority: PriorityEnum.nullish(),
        admin_response: z.string().max(5000).nullish(),
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
      admin_response?: string | null;
      resolved_at?: string;
    } = {};
    if (data.status) {
      patch.status = data.status;
      if (data.status === "resolvido") patch.resolved_at = new Date().toISOString();
    }
    if (data.priority) patch.priority = data.priority;
    if (data.admin_response !== undefined) patch.admin_response = data.admin_response;
    const { error } = await supabase.from("user_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUserRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase.from("user_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

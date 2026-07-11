// Admin server functions for the Jobs module.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId, _role: "admin",
  });
  if (error || !data) throw new Error("Acesso restrito a administradores.");
}

const SourceInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  kind: z.enum(["api", "scrape", "manual"]),
  endpoint_url: z.string().url().nullish(),
  config: z.record(z.unknown()).default({}),
  is_active: z.boolean().default(true),
  sync_frequency_minutes: z.number().int().min(5).max(43200).default(60),
});

export const adminListJobSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("job_sources").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SourceInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("job_sources").update(data).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("job_sources").insert(data).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("job_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRunJobSourceSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runSourceSync } = await import("@/lib/jobs-sync.server");
    return await runSourceSync(supabaseAdmin, data.id);
  });

export const adminListJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({
    q: z.string().max(120).optional(),
    source_id: z.string().uuid().optional(),
    is_active: z.enum(["all", "yes", "no"]).default("all"),
    page: z.number().int().min(1).max(200).default(1),
    pageSize: z.number().int().min(10).max(100).default(50),
  }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = context.supabase
      .from("jobs")
      .select("id, title, company_name, location_city, location_state, is_remote, is_active, posted_at, source_id, apply_url, job_sources(name)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.source_id) q = q.eq("source_id", data.source_id);
    if (data.is_active === "yes") q = q.eq("is_active", true);
    if (data.is_active === "no") q = q.eq("is_active", false);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

const ManualJobInput = z.object({
  id: z.string().uuid().optional(),
  source_id: z.string().uuid(),
  external_id: z.string().max(120).optional(),
  title: z.string().min(3).max(300),
  company_name: z.string().max(200).nullish(),
  description: z.string().max(8000).nullish(),
  location_city: z.string().max(120).nullish(),
  location_state: z.string().max(4).nullish(),
  is_remote: z.boolean().default(false),
  employment_type: z.string().max(40).nullish(),
  experience_level: z.string().max(40).nullish(),
  salary_min: z.number().nullish(),
  salary_max: z.number().nullish(),
  salary_currency: z.string().max(6).default("BRL"),
  apply_url: z.string().url().nullish(),
  category: z.string().max(80).nullish(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  expires_at: z.string().datetime().nullish(),
  is_active: z.boolean().default(true),
});

export const adminUpsertJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ManualJobInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data, posted_at: new Date().toISOString(), external_id: data.external_id || `manual-${Date.now()}` };
    if (data.id) {
      const { error } = await context.supabase.from("jobs").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("jobs").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("jobs").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListJobSyncLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("job_sync_logs")
      .select("*, job_sources(name, slug)")
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

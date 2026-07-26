import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { assertAdmin as assertAdminHelper, type AdminContext } from "@/lib/auth/assert-admin";

const CreateSchema = z.object({
  company_id: z.string().uuid(),
  role_requested: z.enum(["owner", "collaborator"]).default("owner"),
  full_name: z.string().trim().min(2).max(120),
  position: z.string().trim().max(120).nullish(),
  corporate_email: z.string().trim().email().max(320).nullish(),
  phone: z.string().trim().max(30).nullish(),
  justification: z.string().trim().max(2000).nullish(),
  evidence_url: z.string().trim().max(2000).nullish(),
});

const ReviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  admin_notes: z.string().max(2000).nullish(),
});

const ListSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]).nullish(),
    search: z.string().max(200).nullish(),
    limit: z.number().int().min(1).max(200).default(100),
  })
  .default({ limit: 100 });

async function assertAdmin(ctx: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> } }, userId: string) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const createCompanyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => CreateSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("company_claims")
      .select("id, status")
      .eq("company_id", data.company_id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("Você já possui uma solicitação pendente para esta empresa.");

    const { data: row, error } = await supabase
      .from("company_claims")
      .insert({
        company_id: data.company_id,
        user_id: userId,
        role_requested: data.role_requested,
        full_name: data.full_name,
        position: data.position ?? null,
        corporate_email: data.corporate_email ?? null,
        phone: data.phone ?? null,
        justification: data.justification ?? null,
        evidence_url: data.evidence_url ?? null,
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("company_claims")
      .select("id, company_id, status, role_requested, admin_notes, reviewed_at, created_at, companies:companies(id, name, slug, logo_url, owner_id)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMyClaimForCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ company_id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("company_claims")
      .select("id, status, created_at, admin_notes")
      .eq("company_id", data.company_id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const listCompanyClaimsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ListSchema.parse(raw ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(context, userId);

    let q = supabase
      .from("company_claims")
      .select("*, companies:companies(id, name, slug, logo_url, owner_id), profiles:profiles!company_claims_user_id_fkey(id, name)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) q = q.ilike("full_name", `%${data.search}%`);
    const { data: rows, error } = await q;
    // profiles join may not resolve (no explicit FK) — retry without it.
    if (error) {
      let q2 = supabase
        .from("company_claims")
        .select("*, companies:companies(id, name, slug, logo_url, owner_id)")
        .order("created_at", { ascending: false })
        .limit(data.limit);
      if (data.status) q2 = q2.eq("status", data.status);
      if (data.search) q2 = q2.ilike("full_name", `%${data.search}%`);
      const retry = await q2;
      if (retry.error) throw new Error(retry.error.message);
      return retry.data ?? [];
    }
    return rows ?? [];
  });

export const reviewCompanyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => ReviewSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(context, userId);
    const { error } = await supabase
      .from("company_claims")
      .update({
        status: data.status,
        admin_notes: data.admin_notes ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompanyClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(context, userId);
    const { error } = await supabase.from("company_claims").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

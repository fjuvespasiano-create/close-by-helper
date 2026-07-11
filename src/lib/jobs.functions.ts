// Public server functions for the Jobs module (listing + detail).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

const ListInput = z.object({
  q: z.string().trim().max(120).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(4).optional(),
  category: z.string().trim().max(80).optional(),
  remote: z.enum(["all", "yes", "no"]).default("all"),
  page: z.number().int().min(1).max(200).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export const listJobs = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => ListInput.parse(raw))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = supabase
      .from("jobs")
      .select(
        "id, title, company_name, location_city, location_state, is_remote, employment_type, experience_level, salary_min, salary_max, salary_currency, apply_url, category, tags, posted_at",
        { count: "exact" },
      )
      .eq("is_active", true)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .range(from, to);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    if (data.city) q = q.ilike("location_city", data.city);
    if (data.state) q = q.ilike("location_state", data.state);
    if (data.category) q = q.eq("category", data.category);
    if (data.remote === "yes") q = q.eq("is_remote", true);
    if (data.remote === "no") q = q.eq("is_remote", false);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const getJob = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("jobs")
      .select("*, job_sources(name, slug)")
      .eq("id", data.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

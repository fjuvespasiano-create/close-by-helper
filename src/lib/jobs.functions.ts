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
  employment: z.string().trim().max(40).optional(),
  experience: z.string().trim().max(40).optional(),
  salaryMin: z.number().int().min(0).max(1000000).optional(),
  sort: z.enum(["recent", "salary_desc", "salary_asc"]).default("recent"),
  page: z.number().int().min(1).max(200).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

function escapeIlike(s: string) {
  return s.replace(/[%_\\]/g, (m) => `\\${m}`);
}

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
      .range(from, to);

    // Sorting
    if (data.sort === "salary_desc") {
      q = q.order("salary_max", { ascending: false, nullsFirst: false });
    } else if (data.sort === "salary_asc") {
      q = q.order("salary_min", { ascending: true, nullsFirst: false });
    } else {
      q = q.order("posted_at", { ascending: false, nullsFirst: false });
    }

    if (data.q) {
      const term = escapeIlike(data.q);
      q = q.or(
        `title.ilike.%${term}%,company_name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`,
      );
    }
    if (data.city) q = q.ilike("location_city", data.city);
    if (data.state) q = q.ilike("location_state", data.state);
    if (data.category) q = q.eq("category", data.category);
    if (data.remote === "yes") q = q.eq("is_remote", true);
    if (data.remote === "no") q = q.eq("is_remote", false);
    if (data.employment) q = q.ilike("employment_type", data.employment);
    if (data.experience) q = q.ilike("experience_level", data.experience);
    if (data.salaryMin) {
      // Vaga passa se salary_max OU salary_min for ≥ mínimo pedido.
      q = q.or(`salary_max.gte.${data.salaryMin},salary_min.gte.${data.salaryMin}`);
    }

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

/** Facets/aggregations to power dynamic filter suggestions. */
export const jobFacets = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("employment_type, experience_level, category")
    .eq("is_active", true)
    .limit(1000);
  if (error) throw new Error(error.message);
  const employment = new Set<string>();
  const experience = new Set<string>();
  const category = new Set<string>();
  for (const r of data ?? []) {
    if (r.employment_type) employment.add(r.employment_type);
    if (r.experience_level) experience.add(r.experience_level);
    if (r.category) category.add(r.category);
  }
  return {
    employment: [...employment].sort(),
    experience: [...experience].sort(),
    category: [...category].sort(),
  };
});

// Public server functions for the Procurements (editais) module.
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
  citySlug: z.string().trim().max(80).optional(),
  modality: z.string().trim().max(40).optional(),
  status: z.enum(["open", "suspended", "canceled", "finished", "unknown", "all"]).default("all"),
  page: z.number().int().min(1).max(200).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export const listProcurements = createServerFn({ method: "GET" })
  .validator((raw: unknown) => ListInput.parse(raw))
  .handler(async ({ data }) => {
    const supabase = publicClient();

    let cityId: string | null = null;
    if (data.citySlug) {
      const { data: c } = await supabase
        .from("cities")
        .select("id")
        .eq("slug", data.citySlug)
        .maybeSingle();
      cityId = c?.id ?? null;
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabase
      .from("procurements")
      .select(
        "id, city_id, source_site, source_url, external_id, process_number, modality, title, object, agency, status, publish_date, opening_date, deadline_date, estimated_value, files, scraped_at",
        { count: "exact" },
      )
      .order("publish_date", { ascending: false, nullsFirst: false })
      .order("scraped_at", { ascending: false })
      .range(from, to);

    if (cityId) q = q.eq("city_id", cityId);
    if (data.modality) q = q.eq("modality", data.modality);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.q) q = q.or(`title.ilike.%${data.q}%,object.ilike.%${data.q}%`);

    const { data: rows, error, count } = await q;
    if (error) throw new Error(error.message);

    const { data: cities } = await supabase
      .from("cities")
      .select("id, slug, name")
      .in("slug", ["vespasiano", "sao-jose-da-lapa"]);

    return {
      items: rows ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      cities: cities ?? [],
    };
  });

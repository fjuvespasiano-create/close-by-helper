import { createFileRoute } from "@tanstack/react-router";

/**
 * Sync incremental do projeto Supabase original (ache-servico-perto.lovable.app).
 * Busca via PostgREST anônima e faz upsert por slug/id no banco atual.
 * Executado por pg_cron; qualquer erro é reportado no response body para inspeção via cron.job_run_details.
 */

const ORIGIN_URL = "https://lojruwfrypgwqfgzlmop.supabase.co";
const ORIGIN_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvanJ1d2ZyeXBnd3FmZ3psbW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTU1NjUsImV4cCI6MjA5NzYzMTU2NX0.7sQEdCd1zIoP4ftgMU60WYGT-2c3iXIEcG_yg-zytSM";

async function fetchAll(table: string, select = "*"): Promise<unknown[]> {
  const rows: unknown[] = [];
  const pageSize = 1000;
  let offset = 0;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      while (true) {
        const res = await fetch(
          `${ORIGIN_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=${pageSize}&offset=${offset}`,
          {
            headers: {
              apikey: ORIGIN_KEY,
              Authorization: `Bearer ${ORIGIN_KEY}`,
              Prefer: "count=exact",
            },
          },
        );
        if (!res.ok) throw new Error(`origin ${table} HTTP ${res.status}: ${await res.text()}`);
        const chunk = (await res.json()) as unknown[];
        rows.push(...chunk);
        if (chunk.length < pageSize) return rows;
        offset += pageSize;
      }
    } catch (err) {
      if (attempt === 4) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return rows;
}

export const Route = createFileRoute("/api/public/hooks/sync-original")({
  server: {
    handlers: {
      POST: async () => {
        const started = Date.now();
        const report: Record<string, unknown> = { started_at: new Date().toISOString() };

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // 1) cities
          const cities = (await fetchAll(
            "cities",
            "id,slug,name,state,lat,lng,is_active",
          )) as Array<Record<string, unknown>>;
          if (cities.length) {
            const { error } = await supabaseAdmin.from("cities").upsert(cities, { onConflict: "slug" });
            if (error) throw new Error(`cities upsert: ${error.message}`);
          }
          report.cities = cities.length;

          // 2) categories
          const categories = (await fetchAll(
            "categories",
            "id,slug,name,icon,sort,is_active",
          )) as Array<Record<string, unknown>>;
          if (categories.length) {
            const { error } = await supabaseAdmin
              .from("categories")
              .upsert(categories, { onConflict: "slug" });
            if (error) throw new Error(`categories upsert: ${error.message}`);
          }
          report.categories = categories.length;

          // 3) companies (todas as colunas seguras)
          const companyCols =
            "id,slug,name,tagline,description,phone,whatsapp,email,address,zip,city_id,lat,lng,website,instagram,facebook,hours,logo_url,banner_url,plan,featured,status,is_verified,rating,review_count,video_url,badges,price_range,founded_year";
          const companies = (await fetchAll("companies", companyCols)) as Array<Record<string, unknown>>;
          const companyIds = new Set(companies.map((c) => c.id as string));
          if (companies.length) {
            // upsert em batches de 500 para não estourar limites
            for (let i = 0; i < companies.length; i += 500) {
              const batch = companies.slice(i, i + 500);
              const { error } = await supabaseAdmin
                .from("companies")
                .upsert(batch, { onConflict: "slug" });
              if (error) throw new Error(`companies upsert batch ${i}: ${error.message}`);
            }
          }
          report.companies = companies.length;

          // 4) company_categories (só para empresas presentes)
          const cc = (await fetchAll("company_categories", "company_id,category_id")) as Array<{
            company_id: string;
            category_id: string;
          }>;
          const ccFiltered = cc.filter((r) => companyIds.has(r.company_id));
          if (ccFiltered.length) {
            for (let i = 0; i < ccFiltered.length; i += 500) {
              const batch = ccFiltered.slice(i, i + 500);
              const { error } = await supabaseAdmin
                .from("company_categories")
                .upsert(batch, { onConflict: "company_id,category_id", ignoreDuplicates: true });
              if (error) throw new Error(`company_categories upsert batch ${i}: ${error.message}`);
            }
          }
          report.company_categories = ccFiltered.length;

          // 5) company_media
          const media = (await fetchAll(
            "company_media",
            "id,company_id,type,url,caption,sort,created_at",
          )) as Array<Record<string, unknown>>;
          const mediaFiltered = media.filter((m) => companyIds.has(m.company_id as string));
          if (mediaFiltered.length) {
            const { error } = await supabaseAdmin
              .from("company_media")
              .upsert(mediaFiltered, { onConflict: "id" });
            if (error) throw new Error(`company_media upsert: ${error.message}`);
          }
          report.company_media = mediaFiltered.length;

          report.duration_ms = Date.now() - started;
          report.ok = true;
          return Response.json(report);
        } catch (err) {
          report.ok = false;
          report.error = err instanceof Error ? err.message : String(err);
          report.duration_ms = Date.now() - started;
          console.error("[sync-original] failed", report);
          return new Response(JSON.stringify(report), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

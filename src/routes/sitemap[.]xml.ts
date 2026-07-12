import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://close-by-helper.lovable.app";

type Entry = { path: string; lastmod?: string; changefreq?: string; priority?: string };

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        const sb = url && key
          ? createClient(url, key, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } })
          : null;

        const entries: Entry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/buscar", changefreq: "weekly", priority: "0.9" },
          { path: "/sobre", changefreq: "monthly", priority: "0.5" },
          { path: "/contato", changefreq: "monthly", priority: "0.5" },
          { path: "/planos", changefreq: "monthly", priority: "0.6" },
          { path: "/blog", changefreq: "daily", priority: "0.9" },
          { path: "/eventos", changefreq: "daily", priority: "0.8" },
          { path: "/empregos", changefreq: "daily", priority: "0.8" },
          { path: "/marketplace", changefreq: "daily", priority: "0.7" },
          { path: "/promocoes", changefreq: "daily", priority: "0.7" },
          { path: "/o-que-fazer", changefreq: "weekly", priority: "0.7" },
          { path: "/roteiro-turistico", changefreq: "weekly", priority: "0.7" },
          { path: "/servicos-publicos", changefreq: "monthly", priority: "0.7" },
          { path: "/transporte", changefreq: "weekly", priority: "0.6" },
          { path: "/emergencia", changefreq: "monthly", priority: "0.7" },
          { path: "/ao-vivo", changefreq: "hourly", priority: "0.7" },
          { path: "/agora", changefreq: "hourly", priority: "0.6" },
          { path: "/representantes", changefreq: "weekly", priority: "0.6" },
          { path: "/reputacao", changefreq: "monthly", priority: "0.5" },
          { path: "/transparencia", changefreq: "monthly", priority: "0.5" },
          { path: "/vespasiano", changefreq: "weekly", priority: "0.8" },
        ];

        if (sb) {
          const [cities, cats, companies, posts, events, jobs, reps] = await Promise.all([
            sb.from("cities").select("slug").eq("is_active", true),
            sb.from("categories").select("slug"),
            sb.from("companies").select("slug, updated_at").eq("status", "active"),
            sb.from("posts").select("slug, updated_at").eq("status", "published").eq("type", "blog"),
            sb.from("events").select("slug, updated_at").eq("status", "published"),
            sb.from("jobs").select("id, updated_at").eq("status", "active"),
            sb.from("representatives").select("id, updated_at").eq("is_active", true),
          ]);
          for (const c of cities.data ?? []) entries.push({ path: `/cidades/${(c as { slug: string }).slug}`, changefreq: "weekly", priority: "0.7" });
          for (const c of cats.data ?? []) entries.push({ path: `/categoria/${(c as { slug: string }).slug}`, changefreq: "weekly", priority: "0.6" });
          for (const c of companies.data ?? []) {
            const row = c as { slug: string; updated_at: string | null };
            entries.push({ path: `/empresa/${row.slug}`, lastmod: row.updated_at ?? undefined, changefreq: "weekly", priority: "0.7" });
          }
          for (const p of posts.data ?? []) {
            const row = p as { slug: string; updated_at: string | null };
            entries.push({ path: `/blog/${row.slug}`, lastmod: row.updated_at ?? undefined, changefreq: "monthly", priority: "0.6" });
          }
          for (const e of events.data ?? []) {
            const row = e as { slug: string; updated_at: string | null };
            entries.push({ path: `/eventos/${row.slug}`, lastmod: row.updated_at ?? undefined, changefreq: "weekly", priority: "0.6" });
          }
          for (const j of jobs.data ?? []) {
            const row = j as { id: string; updated_at: string | null };
            entries.push({ path: `/empregos/${row.id}`, lastmod: row.updated_at ?? undefined, changefreq: "weekly", priority: "0.5" });
          }
          for (const r of reps.data ?? []) {
            const row = r as { id: string; updated_at: string | null };
            entries.push({ path: `/representantes/${row.id}`, lastmod: row.updated_at ?? undefined, changefreq: "monthly", priority: "0.5" });
          }
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ].filter(Boolean).join("\n"),
          ),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});

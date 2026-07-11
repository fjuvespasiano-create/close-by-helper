import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        const sb = url && key
          ? createClient(url, key, { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } })
          : null;

        const entries: { path: string; changefreq?: string; priority?: string }[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/buscar", changefreq: "weekly", priority: "0.8" },
          { path: "/sobre", changefreq: "monthly", priority: "0.5" },
          { path: "/contato", changefreq: "monthly", priority: "0.5" },
        ];

        if (sb) {
          const [cities, cats, companies] = await Promise.all([
            sb.from("cities").select("slug"),
            sb.from("categories").select("slug"),
            sb.from("companies").select("slug").eq("status", "active"),
          ]);
          for (const c of cities.data ?? []) entries.push({ path: `/cidades/${c.slug}`, changefreq: "weekly" });
          for (const c of cats.data ?? []) entries.push({ path: `/categoria/${c.slug}`, changefreq: "weekly" });
          for (const c of companies.data ?? []) entries.push({ path: `/empresa/${c.slug}`, changefreq: "weekly" });
        }

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) =>
            `  <url><loc>${BASE_URL}${e.path}</loc>${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `<priority>${e.priority}</priority>` : ""}</url>`,
          ),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, { headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});

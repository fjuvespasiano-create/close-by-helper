import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público (sob demanda + cron semanal) que dispara o scraper de
 * serviços públicos. Protegido pelo header `apikey` (chave publishable do
 * Supabase) — mesmo padrão dos demais hooks agendados via pg_cron.
 */
export const Route = createFileRoute("/api/public/hooks/scrape-services")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { runServicesScrape } = await import("@/lib/services-scrape.server");
          const report = await runServicesScrape();
          return Response.json(report);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[scrape-services] failed", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

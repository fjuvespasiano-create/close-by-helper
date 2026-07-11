import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público (sob demanda + cron) que dispara o scraper de eventos
 * do TripAdvisor para Vespasiano e São José da Lapa. Protegido pelo header
 * `apikey` (chave publishable do Supabase) — mesmo padrão dos demais hooks.
 */
export const Route = createFileRoute("/api/public/hooks/scrape-events")({
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
          const { runEventsScrape } = await import("@/lib/events-scrape.server");
          const report = await runEventsScrape();
          return Response.json(report);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[scrape-events] failed", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

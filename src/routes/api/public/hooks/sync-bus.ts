import { createFileRoute } from "@tanstack/react-router";

/**
 * Dispara o scraper de horários de ônibus metropolitanos
 * (Vespasiano e São José da Lapa). Chamado por pg_cron semanalmente.
 * Protegido por header `apikey` (chave publishable).
 */
export const Route = createFileRoute("/api/public/hooks/sync-bus")({
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
          const { runBusScrape } = await import("@/lib/bus-scrape.server");
          const report = await runBusScrape();
          return Response.json(report);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[sync-bus] failed", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

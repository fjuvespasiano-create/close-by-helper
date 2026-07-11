import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público que dispara o scraper de atividades legislativas/executivas
 * (câmaras + prefeituras + DOM-MG). Chamado por pg_cron diariamente às 04:30 UTC.
 * Protegido por header `apikey` (chave publishable do Supabase).
 */
export const Route = createFileRoute("/api/public/hooks/sync-representatives")({
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
          const { runRepresentativesScrape } = await import("@/lib/representatives-scrape.server");
          const report = await runRepresentativesScrape();
          return Response.json(report);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[sync-representatives] failed", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

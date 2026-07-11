import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público (sob demanda + cron semanal) que dispara o scraper de
 * serviços públicos. Protegido por CRON_SECRET (header `x-cron-secret`).
 */
export const Route = createFileRoute("/api/public/hooks/scrape-services")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;

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

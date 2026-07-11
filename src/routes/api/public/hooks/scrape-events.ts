import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint público (sob demanda + cron) que dispara o scraper de eventos
 * do TripAdvisor. Protegido por CRON_SECRET (header `x-cron-secret`).
 */
export const Route = createFileRoute("/api/public/hooks/scrape-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;

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

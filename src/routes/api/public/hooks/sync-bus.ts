import { createFileRoute } from "@tanstack/react-router";

/**
 * Dispara o scraper de horários de ônibus metropolitanos.
 * Protegido por CRON_SECRET (header `x-cron-secret`).
 */
export const Route = createFileRoute("/api/public/hooks/sync-bus")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;
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

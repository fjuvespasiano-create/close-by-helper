import { createFileRoute } from "@tanstack/react-router";

/**
 * Endpoint que dispara o scraper de atividades legislativas/executivas.
 * Protegido por CRON_SECRET (header `x-cron-secret`).
 */
export const Route = createFileRoute("/api/public/hooks/sync-representatives")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;
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

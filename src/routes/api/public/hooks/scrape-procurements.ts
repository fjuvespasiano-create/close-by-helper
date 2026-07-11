import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/scrape-procurements")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;
        try {
          const { scrapeAllProcurements } = await import("@/lib/procurements-scrape.server");
          const reports = await scrapeAllProcurements();
          return Response.json({ ok: true, reports });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[scrape-procurements] failed", err);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

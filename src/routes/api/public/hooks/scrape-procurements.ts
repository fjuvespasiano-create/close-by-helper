import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/scrape-procurements")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
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

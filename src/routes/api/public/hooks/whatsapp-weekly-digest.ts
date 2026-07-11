import { createFileRoute } from "@tanstack/react-router";

/** Cron sextas 15:00 UTC (12h BRT): envia digest semanal aos assinantes. */
export const Route = createFileRoute("/api/public/hooks/whatsapp-weekly-digest")({
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
          const { runWeeklyDigest } = await import("@/lib/whatsapp-weekly-digest.server");
          const report = await runWeeklyDigest();
          return Response.json(report);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[wpp-digest] failed", message);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

/** Cron sextas 15:00 UTC: envia digest semanal aos assinantes. */
export const Route = createFileRoute("/api/public/hooks/whatsapp-weekly-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;
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

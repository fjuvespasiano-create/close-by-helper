// Cron hook: processa notificações agendadas + retry de falhas transitórias.
// Autenticado via header `x-cron-secret` (CRON_SECRET).
import { createFileRoute } from "@tanstack/react-router";

const cors = { "Content-Type": "application/json" } as const;

export const Route = createFileRoute("/api/public/hooks/push-scheduler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkCronAuth } = await import("@/lib/cron-auth.server");
        const unauth = checkCronAuth(request);
        if (unauth) return unauth;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { processScheduled, retryFailedDeliveries } = await import(
            "@/lib/push-dispatch.server"
          );
          const [scheduled, retries] = await Promise.all([
            processScheduled(supabaseAdmin, 20),
            retryFailedDeliveries(supabaseAdmin, 100),
          ]);
          return new Response(
            JSON.stringify({ ok: true, scheduled, retries, at: new Date().toISOString() }),
            { headers: cors },
          );
        } catch (e) {
          console.error("[push-scheduler] error", (e as Error).message);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: cors },
          );
        }
      },
    },
  },
});

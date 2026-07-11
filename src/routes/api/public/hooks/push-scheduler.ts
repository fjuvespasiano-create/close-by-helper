// Cron hook: processa notificações agendadas + retry de falhas transitórias.
// Chamado pelo pg_cron a cada minuto. Autenticado via header `apikey` = publishable key.
import { createFileRoute } from "@tanstack/react-router";

const cors = { "Content-Type": "application/json" } as const;

export const Route = createFileRoute("/api/public/hooks/push-scheduler")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: cors,
          });
        }

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

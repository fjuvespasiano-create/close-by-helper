// Cron hook: sincroniza fontes de vagas ativas cujo intervalo já venceu.
// Autenticado via header `apikey` = SUPABASE_PUBLISHABLE_KEY.
import { createFileRoute } from "@tanstack/react-router";

const cors = { "Content-Type": "application/json" } as const;

export const Route = createFileRoute("/api/public/hooks/jobs-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { runDueSources } = await import("@/lib/jobs-sync.server");
          const result = await runDueSources(supabaseAdmin);
          return new Response(JSON.stringify({ ok: true, ...result, at: new Date().toISOString() }), { headers: cors });
        } catch (e) {
          console.error("[jobs-sync] error", (e as Error).message);
          return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), { status: 500, headers: cors });
        }
      },
    },
  },
});

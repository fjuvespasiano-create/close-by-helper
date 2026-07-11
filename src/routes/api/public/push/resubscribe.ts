// B2/B3: SW-only endpoint que troca uma subscription rotacionada pelo navegador.
// Sem sessão HTTP (SW faz o request), então validamos que o old_endpoint existe
// e reutilizamos o mesmo user_id para persistir a nova.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Schema = z.object({
  old_endpoint: z.string().url(),
  new_subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  }),
});

const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } as const;

// Whitelist dos serviços push conhecidos (S4)
const ALLOWED_HOSTS = new Set([
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "web.push.apple.com",
  "wns2-am3p.notify.windows.com",
]);

function isAllowedEndpoint(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return [...ALLOWED_HOSTS].some((h) => u.hostname === h || u.hostname.endsWith("." + h.split(".").slice(-2).join(".")));
  } catch { return false; }
}

export const Route = createFileRoute("/api/public/push/resubscribe")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }),
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); }
        catch { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: cors }); }
        const parsed = Schema.safeParse(body);
        if (!parsed.success) return new Response(JSON.stringify({ error: "invalid" }), { status: 400, headers: cors });

        const { old_endpoint, new_subscription } = parsed.data;
        if (!isAllowedEndpoint(new_subscription.endpoint)) {
          return new Response(JSON.stringify({ error: "endpoint host not allowed" }), { status: 400, headers: cors });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: existing } = await supabaseAdmin
          .from("push_subscriptions")
          .select("user_id, user_agent, platform, is_pwa")
          .eq("endpoint", old_endpoint)
          .maybeSingle();

        if (!existing) {
          return new Response(JSON.stringify({ error: "unknown subscription" }), { status: 404, headers: cors });
        }

        const now = new Date().toISOString();
        const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
          {
            user_id: existing.user_id,
            endpoint: new_subscription.endpoint,
            p256dh: new_subscription.keys.p256dh,
            auth: new_subscription.keys.auth,
            user_agent: existing.user_agent ?? null,
            platform: existing.platform ?? null,
            is_pwa: existing.is_pwa ?? false,
            last_seen_at: now,
          },
          { onConflict: "endpoint" },
        );
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

        if (old_endpoint !== new_subscription.endpoint) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", old_endpoint);
        }

        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      },
    },
  },
});

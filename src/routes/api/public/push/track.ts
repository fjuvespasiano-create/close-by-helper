import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const TrackSchema = z.object({
  delivery_id: z.number().int().optional(),
  token: z.string().optional(), // HMAC assinado no envio (S1)
  event: z.enum(["delivered", "opened", "clicked", "unsubscribed", "failed"]),
  old_endpoint: z.string().optional(),
});

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
} as const;

export const Route = createFileRoute("/api/public/push/track")({
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
        const parsed = TrackSchema.safeParse(body);
        if (!parsed.success) return new Response(JSON.stringify({ error: "invalid" }), { status: 400, headers: cors });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { delivery_id, event, token } = parsed.data;

        if (event === "unsubscribed") {
          if (parsed.data.old_endpoint) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", parsed.data.old_endpoint);
          }
          return new Response(JSON.stringify({ ok: true }), { headers: cors });
        }

        if (!delivery_id || !token) {
          return new Response(JSON.stringify({ error: "missing token" }), { status: 400, headers: cors });
        }

        // S1: valida assinatura HMAC do delivery_id
        const { verifyDeliveryToken } = await import("@/lib/push-token.server");
        if (!verifyDeliveryToken(delivery_id, token)) {
          return new Response(JSON.stringify({ error: "invalid token" }), { status: 401, headers: cors });
        }

        const { data: deliv } = await supabaseAdmin
          .from("push_deliveries")
          .select("id, notification_id, status, delivered_at, opened_at, clicked_at")
          .eq("id", delivery_id)
          .maybeSingle();

        if (!deliv) return new Response(JSON.stringify({ ok: false }), { status: 404, headers: cors });

        const now = new Date().toISOString();
        const patch: { status?: string; delivered_at?: string; opened_at?: string; clicked_at?: string } = {};
        let counter: "delivered_count" | "opened_count" | "clicked_count" | null = null;

        // Ordem de progresso — nunca rebaixa o status (ex.: opened chegando
        // depois de clicked mantém "clicked").
        const rank: Record<string, number> = { queued: 0, sent: 1, delivered: 2, opened: 3, clicked: 4, failed: -1 };
        const bump = (next: string) => {
          const cur = rank[deliv.status ?? ""] ?? 0;
          if ((rank[next] ?? 0) > cur) patch.status = next;
        };

        if (event === "delivered" && !deliv.delivered_at) {
          patch.delivered_at = now;
          bump("delivered");
          counter = "delivered_count";
        }
        if (event === "opened" && !deliv.opened_at) {
          patch.opened_at = now; bump("opened"); counter = "opened_count";
        }
        if (event === "clicked" && !deliv.clicked_at) {
          patch.clicked_at = now; bump("clicked"); counter = "clicked_count";
        }


        if (Object.keys(patch).length > 0) {
          await supabaseAdmin.from("push_deliveries").update(patch).eq("id", delivery_id);
          if (counter && deliv.notification_id) {
            // H5: incremento atômico via RPC (fallback para read+write se RPC ausente)
            const { error: rpcErr } = await (supabaseAdmin.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>)("increment_push_counter", {
              _notification_id: deliv.notification_id, _counter: counter,
            });
            if (rpcErr) {
              const { data: n } = await supabaseAdmin.from("push_notifications").select(counter).eq("id", deliv.notification_id).maybeSingle();
              const current = (n as Record<string, number> | null)?.[counter] ?? 0;
              const up = counter === "delivered_count" ? { delivered_count: current + 1 }
                : counter === "opened_count" ? { opened_count: current + 1 }
                : { clicked_count: current + 1 };
              await supabaseAdmin.from("push_notifications").update(up).eq("id", deliv.notification_id);
            }
          }
        }

        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      },
    },
  },
});

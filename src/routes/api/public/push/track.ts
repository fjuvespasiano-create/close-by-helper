import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const TrackSchema = z.object({
  delivery_id: z.number().int().optional(),
  event: z.enum(["delivered", "opened", "clicked", "unsubscribed", "resubscribe", "failed"]),
  old_endpoint: z.string().optional(),
});

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
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        };
        let body: unknown;
        try { body = await request.json(); } catch { return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: cors }); }
        const parsed = TrackSchema.safeParse(body);
        if (!parsed.success) return new Response(JSON.stringify({ error: "invalid" }), { status: 400, headers: cors });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { delivery_id, event } = parsed.data;

        if (event === "resubscribe" || event === "unsubscribed" || !delivery_id) {
          if (parsed.data.old_endpoint) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", parsed.data.old_endpoint);
          }
          return new Response(JSON.stringify({ ok: true }), { headers: cors });
        }

        const now = new Date().toISOString();
        const { data: deliv } = await supabaseAdmin
          .from("push_deliveries")
          .select("id, notification_id, status, delivered_at, opened_at, clicked_at")
          .eq("id", delivery_id)
          .maybeSingle();

        if (!deliv) return new Response(JSON.stringify({ ok: false }), { status: 404, headers: cors });

        const patch: { status?: string; delivered_at?: string; opened_at?: string; clicked_at?: string } = {};
        let counter: "delivered_count" | "opened_count" | "clicked_count" | null = null;

        if (event === "delivered" && !deliv.delivered_at) {
          patch.delivered_at = now;
          if (deliv.status === "sent" || deliv.status === "queued") patch.status = "delivered";
          counter = "delivered_count";
        }
        if (event === "opened" && !deliv.opened_at) {
          patch.opened_at = now;
          patch.status = "opened";
          counter = "opened_count";
        }
        if (event === "clicked" && !deliv.clicked_at) {
          patch.clicked_at = now;
          patch.status = "clicked";
          counter = "clicked_count";
        }

        if (Object.keys(patch).length > 0) {
          await supabaseAdmin.from("push_deliveries").update(patch).eq("id", delivery_id);
          if (counter && deliv.notification_id) {
            const { data: n } = await supabaseAdmin.from("push_notifications").select(counter).eq("id", deliv.notification_id).maybeSingle();
            const current = (n as Record<string, number> | null)?.[counter] ?? 0;
            const updatePatch = counter === "delivered_count" ? { delivered_count: current + 1 }
              : counter === "opened_count" ? { opened_count: current + 1 }
              : { clicked_count: current + 1 };
            await supabaseAdmin.from("push_notifications").update(updatePatch).eq("id", deliv.notification_id);
          }
        }

        return new Response(JSON.stringify({ ok: true }), { headers: cors });
      },
    },
  },
});

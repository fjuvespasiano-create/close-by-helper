import { createFileRoute } from "@tanstack/react-router";

/**
 * Chamado pelo bot WhatsApp quando o usuário responde SAIR.
 * Protegido por header `x-bot-token` (WHATSAPP_BOT_TOKEN).
 */
export const Route = createFileRoute("/api/public/hooks/whatsapp-opt-out")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.WHATSAPP_BOT_TOKEN;
        const provided = request.headers.get("x-bot-token");
        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const body = (await request.json().catch(() => ({}))) as { phone?: string };
          if (!body.phone || typeof body.phone !== "string") {
            return new Response(JSON.stringify({ ok: false, error: "phone required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          const { optOutByPhone } = await import("@/lib/whatsapp-weekly-digest.server");
          const result = await optOutByPhone(body.phone);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

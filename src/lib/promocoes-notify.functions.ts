// Server fn: dispara push notification quando uma nova promoção é publicada.
// Público-alvo: usuários da cidade da promoção (audience.kind = "city").
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const notifyNewPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ promotionId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) Carrega a promoção e valida autorização (dono ou admin)
    const { data: promo, error: pErr } = await supabase
      .from("promotions")
      .select(
        "id, slug, title, description, image_url, cover_image, city_id, company_id, status, valid_to, discount_percent, companies(name, owner_id, slug), cities(name, slug)",
      )
      .eq("id", data.promotionId)
      .maybeSingle();
    if (pErr || !promo) throw new Error("Promoção não encontrada.");
    if (promo.status !== "published") {
      return { ok: false, reason: "not_published" as const };
    }

    const ownerId = (promo as unknown as { companies: { owner_id: string } | null }).companies?.owner_id;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (ownerId !== userId && !isAdmin) throw new Error("Sem permissão para notificar.");

    // 2) Monta o push
    const cityName = (promo as unknown as { cities: { name: string; slug: string } | null }).cities?.name;
    const companyName = (promo as unknown as { companies: { name: string } | null }).companies?.name;
    const companySlug = (promo as unknown as { companies: { slug: string } | null }).companies?.slug;
    const discount = (promo as { discount_percent: number | null }).discount_percent;

    const title = discount ? `🔥 ${discount}% OFF: ${promo.title}` : `🎁 Nova promoção: ${promo.title}`;
    const body = [
      promo.description?.trim(),
      companyName ? `Oferecido por ${companyName}` : null,
      cityName ? `📍 ${cityName}` : null,
    ]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 220) || "Confira essa oferta imperdível na sua cidade!";

    const url = `/promocoes?empresa=${companySlug ?? ""}`;
    const image = (promo as { image_url: string | null; cover_image: string | null }).image_url
      ?? (promo as { cover_image: string | null }).cover_image
      ?? null;

    const audience = promo.city_id
      ? { kind: "city" as const, city_id: promo.city_id }
      : { kind: "all" as const };

    // 3) Cria push_notifications
    const { data: notif, error: nErr } = await supabase
      .from("push_notifications")
      .insert({
        created_by: userId,
        title,
        body,
        image_url: image,
        url,
        category: "promocao",
        priority: "normal",
        emoji: "🎁",
        audience,
        status: "sending",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (nErr || !notif) throw new Error(nErr?.message ?? "Falha ao criar push.");

    // 4) Dispatch (server-only)
    const { dispatchNotification } = await import("@/lib/push-dispatch.server");
    const res = await dispatchNotification(supabase, notif.id);
    return { ok: true as const, id: notif.id, ...res };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const subscribeSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D+/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "Telefone inválido"),
  citySlug: z.enum(["vespasiano", "sao-jose-da-lapa"]),
  consent: z.literal(true, { errorMap: () => ({ message: "Consentimento obrigatório" }) }),
});

const CITY_IDS: Record<"vespasiano" | "sao-jose-da-lapa", string> = {
  vespasiano: "c4ccc60b-b17c-4e91-968e-4d38ab42e734",
  "sao-jose-da-lapa": "d9203559-409c-4512-ae93-a5d398afe0b0",
};

/** Normaliza para E.164 BR (+55). */
function toE164BR(digits: string): string {
  const clean = digits.replace(/\D/g, "");
  if (clean.startsWith("55") && clean.length >= 12) return `+${clean}`;
  if (clean.length === 10 || clean.length === 11) return `+55${clean}`;
  return `+${clean}`;
}

/** Envia mensagem via bot local do WhatsApp (se disponível). */
async function sendWelcome(phoneE164: string, name: string, cityName: string): Promise<void> {
  const endpoint = process.env.WHATSAPP_BOT_URL; // ex: http://localhost:3333/send
  const token = process.env.WHATSAPP_BOT_TOKEN;
  if (!endpoint || !token) {
    console.info("[wpp-subscribe] bot não configurado, pulando envio");
    return;
  }
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        to: phoneE164,
        message:
          `Olá, ${name}! 👋\n\nVocê acaba de se inscrever no resumo semanal do AgenddaAqui sobre o que seus representantes de ${cityName} estão fazendo.\n\n` +
          `Toda sexta você recebe aqui um resumão dos projetos, votos, decretos e obras da semana. É gratuito.\n\n` +
          `Para cancelar a qualquer momento, responda SAIR.`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.warn("[wpp-subscribe] falha ao enviar boas-vindas:", err instanceof Error ? err.message : err);
  }
}

export const subscribeWhatsapp = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => subscribeSchema.parse(raw))
  .handler(async ({ data }) => {
    const phone = toE164BR(data.phone);
    const cityId = CITY_IDS[data.citySlug];
    const cityName = data.citySlug === "vespasiano" ? "Vespasiano" : "São José da Lapa";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { error } = await db.from("whatsapp_subscribers").upsert(
      {
        phone,
        name: data.name,
        city_id: cityId,
        is_active: true,
        opted_in_at: new Date().toISOString(),
        opted_out_at: null,
      },
      { onConflict: "phone" },
    );
    if (error) throw new Error(`Falha ao salvar inscrição: ${error.message}`);

    await sendWelcome(phone, data.name, cityName);
    return { ok: true, phone, city: cityName };
  });

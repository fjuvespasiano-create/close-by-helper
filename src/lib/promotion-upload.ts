// Helper: upload de imagem para o bucket privado `promotion-images`.
// Retorna signed URL de longa duração para persistir em promotions.image_url.
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "promotion-images";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function uploadPromotionImage(file: File, userId: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Arquivo deve ser uma imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Imagem deve ter no máximo 5MB.");

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (upErr) throw new Error(upErr.message);

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ONE_YEAR);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Falha ao gerar URL.");
  return data.signedUrl;
}

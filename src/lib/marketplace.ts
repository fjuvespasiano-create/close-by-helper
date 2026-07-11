import { supabase } from "@/integrations/supabase/client";

export type ListingStatus = "ativo" | "vendido" | "pausado" | "removido";
export type ListingCondition = "novo" | "seminovo" | "usado";

export type Listing = {
  id: string;
  slug: string;
  user_id: string;
  city_id: string | null;
  category_slug: string;
  title: string;
  description: string | null;
  price: number | null;
  condition: ListingCondition;
  neighborhood: string | null;
  contact_phone: string | null;
  images: string[];
  status: ListingStatus;
  views_count: number;
  created_at: string;
  updated_at: string;
};

export type ListingCategory = {
  slug: string;
  name: string;
  icon: string | null;
  sort_order: number;
};

export type ListingMessage = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export const CONDITION_LABEL: Record<ListingCondition, string> = {
  novo: "Novo",
  seminovo: "Seminovo",
  usado: "Usado",
};

export const STATUS_LABEL: Record<ListingStatus, string> = {
  ativo: "Ativo",
  vendido: "Vendido",
  pausado: "Pausado",
  removido: "Removido",
};

const IMG_ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const IMG_MAX_BYTES = 5 * 1024 * 1024;
const SIGNED_EXPIRY = 60 * 60 * 24 * 365 * 5;
export const MAX_IMAGES = 6;

export function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return "A combinar";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `há ${d}d`;
  const mo = Math.floor(d / 30);
  return `há ${mo}mo`;
}

export async function uploadListingImage(userId: string, file: File): Promise<string> {
  if (!IMG_ALLOWED.includes(file.type)) throw new Error("Use JPG, PNG ou WebP.");
  if (file.size > IMG_MAX_BYTES) throw new Error("Imagem acima de 5 MB.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `listings/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
  if (upErr) throw upErr;
  const { data: signed, error: sErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, SIGNED_EXPIRY);
  if (sErr || !signed?.signedUrl) throw sErr || new Error("Falha ao gerar URL");
  return signed.signedUrl;
}

export async function fetchCategories(): Promise<ListingCategory[]> {
  const { data, error } = await supabase
    .from("listing_categories")
    .select("slug,name,icon,sort_order")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ListingCategory[];
}

export function toListing(row: Record<string, unknown>): Listing {
  const rawImages = row.images;
  const images = Array.isArray(rawImages)
    ? (rawImages as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return { ...(row as unknown as Listing), images };
}

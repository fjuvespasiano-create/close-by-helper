import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PublicServiceCategory = Database["public"]["Enums"]["public_service_category"];

export type PublicService = Database["public"]["Tables"]["public_services"]["Row"] & {
  cities?: { name: string; slug: string } | null;
};

export type EmergencyContact = Database["public"]["Tables"]["emergency_contacts"]["Row"] & {
  cities?: { name: string; slug: string } | null;
};

export const PUBLIC_SERVICE_CATEGORIES: {
  slug: PublicServiceCategory;
  label: string;
  icon: string;
  description: string;
}[] = [
  { slug: "saude", label: "Saúde", icon: "HeartPulse", description: "Hospitais, UBS, farmácias 24h" },
  { slug: "educacao", label: "Educação", icon: "GraduationCap", description: "Escolas, creches, cursos" },
  { slug: "seguranca", label: "Segurança", icon: "Shield", description: "Delegacias, guarda municipal" },
  { slug: "prefeitura", label: "Prefeitura", icon: "Building2", description: "Secretarias e serviços" },
  { slug: "transporte", label: "Transporte", icon: "Bus", description: "Linhas, rodoviária, terminais" },
  { slug: "assistencia_social", label: "Assistência Social", icon: "HandHeart", description: "CRAS, CREAS, apoio" },
  { slug: "emergencia", label: "Emergência", icon: "Siren", description: "Serviços de urgência 24h" },
  { slug: "outros", label: "Outros", icon: "MoreHorizontal", description: "Demais serviços públicos" },
];

export function categoryLabel(slug: PublicServiceCategory | string | null | undefined): string {
  return PUBLIC_SERVICE_CATEGORIES.find((c) => c.slug === slug)?.label ?? "Outros";
}

const SELECT = `id, name, subtype, description, category, address, neighborhood, phone, phone_secondary,
  whatsapp, email, website, hours, is_24h, lat, lng, active, featured, city_id, created_at, updated_at,
  cities ( name, slug )`;

export async function fetchPublicServices(opts?: {
  citySlug?: string | null;
  category?: PublicServiceCategory | null;
  limit?: number;
}): Promise<PublicService[]> {
  let query = supabase
    .from("public_services")
    .select(SELECT)
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("name");

  if (opts?.citySlug) {
    const { data: city } = await supabase.from("cities").select("id").eq("slug", opts.citySlug).maybeSingle();
    if (city) query = query.eq("city_id", city.id);
    else return [];
  }
  if (opts?.category) query = query.eq("category", opts.category);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as PublicService[];
}

export async function fetchPublicServiceById(id: string): Promise<PublicService | null> {
  const { data, error } = await supabase
    .from("public_services")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as PublicService | null;
}

export async function fetchEmergencyContacts(citySlug?: string | null): Promise<EmergencyContact[]> {
  let cityId: string | null = null;
  if (citySlug) {
    const { data: city } = await supabase.from("cities").select("id").eq("slug", citySlug).maybeSingle();
    cityId = city?.id ?? null;
  }
  let query = supabase
    .from("emergency_contacts")
    .select(`id, name, phone, description, icon, sort_order, active, city_id, created_at, updated_at,
      cities ( name, slug )`)
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (cityId) query = query.or(`city_id.eq.${cityId},city_id.is.null`);
  else query = query.is("city_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as EmergencyContact[];
}

// -------- Admin mutations --------

export type PublicServiceInput = Omit<
  Database["public"]["Tables"]["public_services"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export async function adminUpsertPublicService(input: PublicServiceInput & { id?: string }) {
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from("public_services").update(rest).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("public_services").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function adminDeletePublicService(id: string) {
  const { error } = await supabase.from("public_services").delete().eq("id", id);
  if (error) throw error;
}

export type EmergencyContactInput = Omit<
  Database["public"]["Tables"]["emergency_contacts"]["Insert"],
  "id" | "created_at" | "updated_at"
>;

export async function adminUpsertEmergencyContact(input: EmergencyContactInput & { id?: string }) {
  if (input.id) {
    const { id, ...rest } = input;
    const { error } = await supabase.from("emergency_contacts").update(rest).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("emergency_contacts").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function adminDeleteEmergencyContact(id: string) {
  const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
  if (error) throw error;
}

export async function adminListAllPublicServices(): Promise<PublicService[]> {
  const { data, error } = await supabase
    .from("public_services")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PublicService[];
}

export async function adminListAllEmergencyContacts(): Promise<EmergencyContact[]> {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select(`id, name, phone, description, icon, sort_order, active, city_id, created_at, updated_at,
      cities ( name, slug )`)
    .order("sort_order")
    .order("name");
  if (error) throw error;
  return (data ?? []) as unknown as EmergencyContact[];
}

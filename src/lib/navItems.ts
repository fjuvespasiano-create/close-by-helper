import { supabase } from "@/integrations/supabase/client";

export type NavItem = { to: string; label: string; danger?: boolean };

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/blog", label: "Notícias" },
  { to: "/buscar", label: "Empresas" },
  { to: "/eventos", label: "Eventos" },
  { to: "/o-que-fazer", label: "O que fazer" },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/transporte", label: "Transporte" },
  { to: "/empregos", label: "Empregos" },
  { to: "/promocoes", label: "Promoções" },
];

export async function fetchNavItems(): Promise<NavItem[]> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "nav_items")
    .maybeSingle();
  if (error || !data?.value || !Array.isArray(data.value)) return DEFAULT_NAV_ITEMS;
  const items = (data.value as unknown as NavItem[]).filter(
    (i) => i && typeof i.to === "string" && typeof i.label === "string",
  );
  return items.length ? items : DEFAULT_NAV_ITEMS;
}

export async function saveNavItems(items: NavItem[]): Promise<void> {
  const clean = items
    .map((i) => ({
      to: String(i.to || "").trim(),
      label: String(i.label || "").trim(),
      ...(i.danger ? { danger: true } : {}),
    }))
    .filter((i) => i.to && i.label);
  const { error } = await supabase
    .from("system_settings")
    .upsert(
      { key: "nav_items", value: clean as never, is_public: true, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) throw error;
}

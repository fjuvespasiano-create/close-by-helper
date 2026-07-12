import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteContent = {
  brand: { name: string; tagline: string };
  header: {
    cta_label: string;
    panel_label: string;
    admin_label: string;
    login_label: string;
    logout_label: string;
  };
  footer: {
    about_text: string;
    nav_title: string;
    biz_title: string;
    copyright: string;
    location: string;
  };
  newsletter: {
    title: string;
    description: string;
    email_placeholder: string;
    name_placeholder: string;
    button_label: string;
  };
  home: {
    hero_overline: string;
    hero_title: string;
    hero_subtitle: string;
    cta_title: string;
    cta_subtitle: string;
    cta_button: string;
  };
  about: {
    title: string;
    subtitle: string;
    p1: string;
    p2: string;
    p3: string;
  };
  contact: {
    title: string;
    subtitle: string;
    email: string;
    whatsapp_url: string;
    whatsapp_label: string;
  };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  brand: { name: "AgenddaAqui", tagline: "A cidade inteira no seu bolso" },
  header: {
    cta_label: "Anunciar grátis",
    panel_label: "Meu painel",
    admin_label: "Admin",
    login_label: "Entrar",
    logout_label: "Sair",
  },
  footer: {
    about_text:
      "O guia oficial dos moradores de Vespasiano e São José da Lapa. Serviços públicos, plantão 24h e as empresas mais bem avaliadas da região — grátis, num só lugar.",
    nav_title: "Explore o app",
    biz_title: "Para o seu negócio",
    copyright: "AgenddaAqui — feito na cidade, para a cidade.",
    location: "Vespasiano · São José da Lapa · MG",
  },
  newsletter: {
    title: "Receba o que importa na sua cidade",
    description: "Alertas de plantão, promoções da vizinhança e novidades da região — 1 e-mail por semana, zero spam.",
    email_placeholder: "seu melhor e-mail",
    name_placeholder: "Seu nome (opcional)",
    button_label: "Quero receber",
  },
  home: {
    hero_overline: "Para comerciantes de Vespasiano e São José da Lapa",
    hero_title: "Cansado de ver o cliente fechar com o concorrente?",
    hero_subtitle:
      "Coloque seu negócio na vitrine que a cidade já usa todo dia e receba pedidos direto no seu WhatsApp — sem taxa, sem comissão e sem intermediário levando o seu lucro.",
    cta_title: "Comece hoje a vender mais no WhatsApp",
    cta_subtitle:
      "Mais de mil moradores buscam serviços aqui toda semana. Cadastre seu negócio em 2 minutos, sem cartão, e apareça para quem já está com o dinheiro na mão.",
    cta_button: "Quero receber clientes no meu WhatsApp",

  },
  about: {
    title: "O que é o AgenddaAqui",
    subtitle: "O jeito mais rápido de resolver o dia a dia na sua cidade — sem grupo de WhatsApp e sem \u201Cquem indica?\u201D.",
    p1: "O AgenddaAqui nasceu para acabar com a pergunta \u201Ca quem eu ligo?\u201D. Em um único app, você acessa serviços públicos, telefones de emergência e um guia com as empresas de confiança de Vespasiano e São José da Lapa — organizados por categoria, distância e nota real dos vizinhos.",
    p2: "Cada indicação passa por avaliações de moradores reais, com fotos e comentários abertos. Você contrata com tranquilidade, e o negócio local ganha visibilidade justa — sem intermediários, sem comissão sobre venda e sem taxa escondida.",
    p3: "Grátis para usar. Grátis para anunciar. Se você mora aqui ou empreende aqui, o AgenddaAqui foi feito para você.",
  },
  contact: {
    title: "Fale com a gente",
    subtitle: "Dúvida, sugestão, parceria ou algo travando? A gente responde em até 24 horas úteis.",
    email: "contato@agendaaqui.online",
    whatsapp_url: "https://wa.me/55319980252882",
    whatsapp_label: "WhatsApp: +55 31 99802-52882 (seg. a sex., 9h às 18h)",
  },
};

function deepMerge<T>(base: T, override: unknown): T {
  if (!override || typeof override !== "object") return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    const b = out[k];
    if (b && typeof b === "object" && !Array.isArray(b) && v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = deepMerge(b, v);
    } else if (v !== undefined && v !== null && v !== "") {
      out[k] = v;
    }
  }
  return out as T;
}

export async function fetchSiteContent(): Promise<SiteContent> {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "site_content")
    .maybeSingle();
  if (error || !data?.value) return DEFAULT_SITE_CONTENT;
  return deepMerge(DEFAULT_SITE_CONTENT, data.value);
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  const { error } = await supabase.from("system_settings").upsert(
    {
      key: "site_content",
      value: content as never,
      is_public: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}

export function useSiteContent(): SiteContent {
  const { data } = useQuery({
    queryKey: ["site-content"],
    queryFn: fetchSiteContent,
    staleTime: 5 * 60_000,
    placeholderData: DEFAULT_SITE_CONTENT,
  });
  return data ?? DEFAULT_SITE_CONTENT;
}

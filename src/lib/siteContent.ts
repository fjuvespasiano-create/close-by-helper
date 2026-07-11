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
  brand: { name: "AgendaAqui", tagline: "O app da sua cidade" },
  header: {
    cta_label: "Anunciar minha empresa",
    panel_label: "Meu painel",
    admin_label: "Admin",
    login_label: "Entrar",
    logout_label: "Sair",
  },
  footer: {
    about_text:
      "O guia local de Vespasiano e São José da Lapa. Serviços públicos, telefones de emergência e empresas de confiança — tudo num só app, sempre à mão.",
    nav_title: "Navegue pelo app",
    biz_title: "Para donos de empresa",
    copyright: "AgendaAqui — feito na cidade, para a cidade.",
    location: "Vespasiano · São José da Lapa · MG",
  },
  newsletter: {
    title: "Fique por dentro da cidade",
    description: "Novidades, dicas e alertas úteis toda semana. Sem spam, cancele quando quiser.",
    email_placeholder: "seu melhor e-mail",
    name_placeholder: "Seu nome (opcional)",
    button_label: "Quero receber",
  },
  home: {
    hero_overline: "O app da cidade",
    hero_title: "Tudo o que sua cidade oferece, num só app",
    hero_subtitle:
      "Encontre em segundos: hospital, escola, delegacia, prefeitura e as empresas mais bem avaliadas de Vespasiano e São José da Lapa.",
    cta_title: "Coloque sua empresa no mapa da cidade",
    cta_subtitle:
      "Cadastro grátis em 2 minutos. Apareça para vizinhos que já procuram seu serviço e receba contatos direto no WhatsApp.",
    cta_button: "Anunciar grátis agora",
  },
  about: {
    title: "O que é o AgendaAqui",
    subtitle: "O jeito mais fácil de resolver o dia a dia na sua cidade.",
    p1: "Nasceu para acabar com aquela pergunta chata: \u201Ca quem eu ligo?\u201D. Em um único app, você tem serviços públicos, telefones de emergência e um guia com as melhores empresas de Vespasiano e São José da Lapa.",
    p2: "Cada indicação passa por avaliações reais de moradores. Você contrata com segurança, e negócios locais ganham visibilidade justa — sem intermediários e sem taxas escondidas.",
    p3: "Grátis para usar. Grátis para anunciar. Se você mora aqui ou empreende aqui, este app foi feito para você.",
  },
  contact: {
    title: "Fale com a gente",
    subtitle: "Sugestões, parcerias ou algo travando? Respondemos em até 24h.",
    email: "contato@agendaaqui.online",
    whatsapp_url: "https://wa.me/55319980252882",
    whatsapp_label: "WhatsApp: +55 31 99802-52882 (horário comercial)",
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

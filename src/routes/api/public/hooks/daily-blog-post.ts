// Cron-triggered daily SEO blog post generator.
// Rotates themes across cidade/empresa/genérico, calls Lovable AI Gateway,
// enforces uniqueness against recent posts and persists as published.
import { createFileRoute } from "@tanstack/react-router";

const MIN_CHARS = 2500;

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 90);
}

function stripFence(t: string) {
  const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : t).trim();
}

const GENERIC_TOPICS = [
  "guia rápido para pequenos negócios locais crescerem no digital",
  "checklist para escolher um bom prestador de serviço na sua cidade",
  "como identificar promoções e cupons confiáveis no comércio local",
  "dicas de organização financeira para famílias em cidades médias",
  "como aproveitar melhor os serviços públicos digitais da sua cidade",
  "tendências de consumo local e o papel dos bairros na economia",
  "guia de mobilidade urbana e transporte para o dia a dia",
  "segurança digital para quem vende ou compra em marketplaces locais",
  "empreendedorismo feminino em cidades da região metropolitana de BH",
  "como avaliar corretamente empresas locais antes de contratar",
];

const CATEGORY_ROTATION = ["cidade", "empresa", "digital"] as const;
type Category = (typeof CATEGORY_ROTATION)[number];

function todayIndex() {
  const start = new Date(Date.UTC(2026, 0, 1));
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

async function pickTheme(supabase: ReturnType<typeof import("@supabase/supabase-js").createClient>) {
  const idx = todayIndex();
  const category: Category = CATEGORY_ROTATION[idx % CATEGORY_ROTATION.length];

  let cityId: string | null = null;
  let companyId: string | null = null;
  let keywords = "";
  let cityCtx = "";
  let companyCtx = "";

  if (category === "cidade") {
    const { data: cities } = await supabase
      .from("cities")
      .select("id, name, state, slug")
      .eq("is_active", true);
    if (cities?.length) {
      const c = cities[idx % cities.length] as { id: string; name: string; state: string | null; slug: string };
      cityId = c.id;
      cityCtx = `Cidade: ${c.name}${c.state ? " - " + c.state : ""}.`;
      const topics = [
        `serviços públicos essenciais em ${c.name}`,
        `guia para moradores de ${c.name}`,
        `oportunidades e eventos em ${c.name}`,
        `saúde e cidadania em ${c.name}`,
        `educação e cultura em ${c.name}`,
      ];
      keywords = `${topics[idx % topics.length]}, ${c.name}, ${c.state ?? "MG"}, cidadania, serviços`;
    }
  } else if (category === "empresa") {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, tagline, description, city_id")
      .eq("status", "active")
      .order("plan", { ascending: false })
      .limit(50);
    if (companies?.length) {
      const co = companies[idx % companies.length] as {
        id: string;
        name: string;
        tagline: string | null;
        description: string | null;
        city_id: string | null;
      };
      companyId = co.id;
      companyCtx = `Empresa: ${co.name}${co.tagline ? " — " + co.tagline : ""}. ${co.description ?? ""}`;
      keywords = `${co.name}, serviços locais, ${co.tagline ?? "atendimento"}, dicas para clientes`;
      if (co.city_id) {
        const { data: c2 } = await supabase
          .from("cities")
          .select("name, state")
          .eq("id", co.city_id)
          .maybeSingle();
        const cityRow = c2 as { name: string; state: string | null } | null;
        if (cityRow) cityCtx = `Cidade: ${cityRow.name}${cityRow.state ? " - " + cityRow.state : ""}.`;
      }
    }
  }

  if (!keywords) {
    const topic = GENERIC_TOPICS[idx % GENERIC_TOPICS.length];
    keywords = `${topic}, dicas práticas, guia AgenddaAqui`;
  }

  return { category, cityId, companyId, keywords, cityCtx, companyCtx };
}

async function generateDraft(opts: {
  apiKey: string;
  category: Category;
  keywords: string;
  cityCtx: string;
  companyCtx: string;
  avoidTitles: string[];
}) {
  const guide = {
    empresa:
      "Foque em uma empresa local do AgenddaAqui: diferencial, serviços, público-alvo, dicas de escolha e cuidados ao contratar.",
    cidade:
      "Foque em conteúdo local para moradores: serviços públicos, cultura, cidadania, dicas úteis e canais oficiais.",
    digital:
      "Foque em conteúdo digital/tendências: tutoriais, novidades tecnológicas e dicas para pequenos negócios no ambiente online.",
  }[opts.category];

  const system = `Você é um redator SEO sênior em português brasileiro para o portal AgenddaAqui (Vespasiano e São José da Lapa/MG). Escreva conteúdo original, útil, escaneável, com storytelling leve e tom acessível. Sempre em Markdown, com H2/H3, listas e FAQ ao final. Nunca invente dados oficiais (telefones, endereços, valores) — oriente a consultar canais oficiais.`;

  const avoidBlock = opts.avoidTitles.length
    ? `\nEvite repetir ou parafrasear estes títulos já publicados: ${opts.avoidTitles.slice(0, 20).join(" | ")}`
    : "";

  const user = `Gere um artigo de blog original, otimizado para SEO local e engajamento.

Palavras-chave (a primeira é a principal): ${opts.keywords}
Categoria: ${guide}
${opts.cityCtx}
${opts.companyCtx}${avoidBlock}

Requisitos OBRIGATÓRIOS:
- Conteúdo com NO MÍNIMO 2500 caracteres (ideal 3000-4000). Se ficar curto, expanda com exemplos, listas e uma seção adicional.
- Título único, com até 65 caracteres, incluindo a palavra-chave principal.
- Excerpt com 140 a 180 caracteres.
- Meta title com até 60 caracteres.
- Meta description com 140 a 160 caracteres.
- 5 a 8 tags relevantes.
- Conteúdo em Markdown com H2/H3, ao menos duas listas, storytelling curto na abertura, dados/insights práticos, uma seção de "Como fazer" e FAQ com 3 perguntas ao final.
- Chamada final natural mencionando o AgenddaAqui.

Retorne APENAS JSON válido (sem markdown fences) no formato exato:
{"title":"...","slug":"...","excerpt":"...","meta_title":"...","meta_description":"...","tags":["..."],"content":"..."}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(stripFence(raw)) as {
    title?: string;
    slug?: string;
    excerpt?: string;
    meta_title?: string;
    meta_description?: string;
    tags?: string[];
    content?: string;
  };
  return parsed;
}

export const Route = createFileRoute("/api/public/hooks/daily-blog-post")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const provided = request.headers.get("apikey") ?? "";
          const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
          if (!expected || provided !== expected) {
            return new Response(JSON.stringify({ error: "unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Evita duplicar em uma mesma janela: se já foi publicado hoje, pula.
          const startOfDay = new Date();
          startOfDay.setUTCHours(0, 0, 0, 0);
          const { count: todayCount } = await supabaseAdmin
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("auto_generated", true)
            .gte("published_at", startOfDay.toISOString());
          if ((todayCount ?? 0) > 0) {
            return Response.json({ ok: true, skipped: "already_generated_today" });
          }

          const { data: recent } = await supabaseAdmin
            .from("posts")
            .select("title, slug")
            .eq("auto_generated", true)
            .order("created_at", { ascending: false })
            .limit(30);
          const recentTitles = (recent ?? []).map((r) => (r as { title: string }).title);
          const recentSlugs = new Set((recent ?? []).map((r) => (r as { slug: string }).slug));

          const theme = await pickTheme(supabaseAdmin);

          // Até 2 tentativas para atingir 2500 chars e slug único.
          let draft: Awaited<ReturnType<typeof generateDraft>> | null = null;
          let lastError = "";
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const d = await generateDraft({
                apiKey,
                category: theme.category,
                keywords: theme.keywords,
                cityCtx: theme.cityCtx,
                companyCtx: theme.companyCtx,
                avoidTitles: recentTitles,
              });
              const content = (d.content ?? "").trim();
              if (content.length >= MIN_CHARS && d.title) {
                draft = d;
                break;
              }
              lastError = `curto (${content.length} chars)`;
            } catch (err) {
              lastError = err instanceof Error ? err.message : String(err);
            }
          }
          if (!draft) {
            return Response.json({ ok: false, error: `Falha na geração: ${lastError}` }, { status: 500 });
          }

          const baseSlug = slugify(draft.slug || draft.title || "post");
          let slug = baseSlug;
          let i = 2;
          while (recentSlugs.has(slug)) {
            slug = `${baseSlug}-${i++}`;
          }
          // Também verifica no banco (janela maior)
          const { data: dupe } = await supabaseAdmin
            .from("posts")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();
          if (dupe) slug = `${baseSlug}-${Date.now().toString(36)}`;

          const payload = {
            type: "blog" as const,
            slug,
            title: draft.title!.slice(0, 200),
            excerpt: (draft.excerpt ?? "").slice(0, 300) || null,
            content: draft.content!,
            meta_title: (draft.meta_title ?? draft.title ?? "").slice(0, 200),
            meta_description: (draft.meta_description ?? draft.excerpt ?? "").slice(0, 300),
            tags: Array.isArray(draft.tags) ? draft.tags.slice(0, 10) : [],
            city_id: theme.cityId,
            company_id: theme.companyId,
            author_name: "Equipe AgenddaAqui",
            auto_generated: true,
            status: "published" as const,
            published_at: new Date().toISOString(),
          };

          const { data: row, error } = await supabaseAdmin
            .from("posts")
            .insert(payload)
            .select("id, slug, title")
            .single();
          if (error) throw new Error(error.message);

          return Response.json({
            ok: true,
            post: row,
            category: theme.category,
            length: draft.content!.length,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[daily-blog-post] erro:", msg);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});

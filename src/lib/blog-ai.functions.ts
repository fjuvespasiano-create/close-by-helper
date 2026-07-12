// Server functions for AI-assisted blog post generation.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const GenInput = z.object({
  keywords: z.string().min(2).max(500),
  category: z.enum(["empresa", "cidade", "digital"]),
  city_id: z.string().uuid().nullish(),
  company_id: z.string().uuid().nullish(),
  extra: z.string().max(2000).optional(),
});

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  tags: string[];
  content: string;
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

function stripFence(t: string) {
  const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (m ? m[1] : t).trim();
}

export const adminGenerateBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => GenInput.parse(raw))
  .handler(async ({ data, context }): Promise<Draft> => {
    await assertAdmin(context);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    // Buscar contexto adicional conforme categoria
    let cityCtx = "";
    let companyCtx = "";
    if (data.city_id) {
      const { data: c } = await context.supabase.from("cities")
        .select("name, state, slug").eq("id", data.city_id).maybeSingle();
      if (c) cityCtx = `Cidade: ${c.name}${c.state ? " - " + c.state : ""}.`;
    }
    if (data.company_id) {
      const { data: co } = await context.supabase.from("companies")
        .select("name, category, description, services_offered, city_id").eq("id", data.company_id).maybeSingle();
      if (co) {
        companyCtx = `Empresa: ${co.name}${co.category ? " (" + co.category + ")" : ""}. ${co.description ?? ""}`;
        if (!cityCtx && co.city_id) {
          const { data: c2 } = await context.supabase.from("cities").select("name, state").eq("id", co.city_id).maybeSingle();
          if (c2) cityCtx = `Cidade: ${c2.name}${c2.state ? " - " + c2.state : ""}.`;
        }
      }
    }

    const categoryGuide = {
      empresa: "Foque em uma empresa/negócio local do site AgenddaAqui: diferencial, serviços, público, dicas de escolha, quando procurar.",
      cidade: "Foque em conteúdo local sobre a cidade: serviços públicos, cultura, cidadania, dicas úteis para moradores.",
      digital: "Foque em conteúdo digital e tendências: tutoriais, novidades tecnológicas, dicas para pequenos negócios locais no ambiente digital.",
    }[data.category];

    const system = `Você é um redator SEO sênior em português brasileiro para o portal AgenddaAqui (Vespasiano e São José da Lapa/MG). Escreva conteúdo original, útil, escaneável e em tom acessível. Sempre em Markdown, com H2/H3, listas, FAQ ao final. Nunca invente dados oficiais (telefones, endereços, valores) — em vez disso oriente o leitor a consultar canais oficiais.`;

    const user = `Gere um artigo de blog otimizado para SEO local.

Palavras-chave (a primeira é a principal): ${data.keywords}
Categoria: ${categoryGuide}
${cityCtx}
${companyCtx}
${data.extra ? "Contexto extra: " + data.extra : ""}

Requisitos:
- 800 a 1200 palavras
- Título com até 60 caracteres, incluindo a palavra-chave principal
- Excerpt (resumo) com 140 a 180 caracteres
- Meta title com até 60 caracteres
- Meta description com 140 a 160 caracteres
- 4 a 7 tags/keywords
- Conteúdo em Markdown com H2/H3, listas e FAQ (3 perguntas) ao final
- Chamada final natural mencionando o AgenddaAqui

Retorne APENAS JSON válido (sem markdown fences) no formato:
{"title":"...","slug":"...","excerpt":"...","meta_title":"...","meta_description":"...","tags":["..."],"content":"..."}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
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
      if (res.status === 429) throw new Error("Limite de requisições atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na IA (${res.status}): ${txt.slice(0, 300)}`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "";
    let parsed: Partial<Draft> = {};
    try {
      parsed = JSON.parse(stripFence(raw));
    } catch {
      throw new Error("A IA não retornou JSON válido. Tente novamente.");
    }

    const title = (parsed.title ?? "").trim() || `Guia sobre ${data.keywords.split(",")[0]}`;
    const draft: Draft = {
      title,
      slug: (parsed.slug ?? slugify(title)).trim(),
      excerpt: (parsed.excerpt ?? "").trim(),
      meta_title: (parsed.meta_title ?? title).trim(),
      meta_description: (parsed.meta_description ?? "").trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 10) : [],
      content: (parsed.content ?? "").trim(),
    };
    if (!draft.content) throw new Error("Conteúdo vazio retornado pela IA.");
    return draft;
  });

const SaveInput = z.object({
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(120),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(50),
  meta_title: z.string().max(200).optional(),
  meta_description: z.string().max(500).optional(),
  tags: z.array(z.string()).default([]),
  city_id: z.string().uuid().nullish(),
  company_id: z.string().uuid().nullish(),
  publish: z.boolean().default(false),
  cover_url: z.string().url().nullish(),
});

export const adminSaveAiPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SaveInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      type: "blog" as const,
      slug: slugify(data.slug),
      title: data.title,
      excerpt: data.excerpt || null,
      content: data.content,
      meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
      tags: data.tags,
      city_id: data.city_id ?? null,
      company_id: data.company_id ?? null,
      featured_image: data.cover_url ?? null,
      og_image: data.cover_url ?? null,
      author_name: "Equipe AgenddaAqui",
      auto_generated: true,
      status: (data.publish ? "published" : "draft") as "published" | "draft",
      published_at: data.publish ? new Date().toISOString() : null,
    };
    const { data: row, error } = await context.supabase
      .from("posts").insert(payload).select("id, slug, status").single();
    if (error) throw new Error(error.message);
    return row;
  });

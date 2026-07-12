import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Save, Send, Building2, MapPin, Rocket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { adminGenerateBlogPost, adminSaveAiPost } from "@/lib/blog-ai.functions";

export const Route = createFileRoute("/admin/blog-ai")({
  head: () => ({ meta: [{ title: "Gerador IA — Blog | Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminBlogAi,
});

type Category = "empresa" | "cidade" | "digital";

type Draft = {
  title: string;
  slug: string;
  excerpt: string;
  meta_title: string;
  meta_description: string;
  tags: string[];
  content: string;
};

const CATS: { id: Category; label: string; desc: string; icon: typeof Building2 }[] = [
  { id: "empresa", label: "Empresa", desc: "Sobre um negócio local do site", icon: Building2 },
  { id: "cidade", label: "Cidade", desc: "Serviços, cultura e cidadania", icon: MapPin },
  { id: "digital", label: "Digital", desc: "Tendências e tutoriais", icon: Rocket },
];

function AdminBlogAi() {
  const [keywords, setKeywords] = useState("");
  const [category, setCategory] = useState<Category>("cidade");
  const [cityId, setCityId] = useState<string>("");
  const [companyId, setCompanyId] = useState<string>("");
  const [extra, setExtra] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tagsInput, setTagsInput] = useState("");

  const { data: cities } = useQuery({
    queryKey: ["ai-cities"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id, name, state").eq("is_active", true).order("name");
      return data ?? [];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["ai-companies"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id, name").order("name").limit(500);
      return data ?? [];
    },
    enabled: category === "empresa",
  });

  const generateFn = useServerFn(adminGenerateBlogPost);
  const saveFn = useServerFn(adminSaveAiPost);

  const generate = useMutation({
    mutationFn: async () => {
      return await generateFn({
        data: {
          keywords: keywords.trim(),
          category,
          city_id: cityId || null,
          company_id: category === "empresa" ? companyId || null : null,
          extra: extra.trim() || undefined,
        },
      });
    },
    onSuccess: (d) => {
      setDraft(d);
      toast.success("Rascunho gerado! Revise antes de publicar.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      if (!draft) throw new Error("Nada para salvar.");
      return await saveFn({
        data: {
          ...draft,
          city_id: cityId || null,
          company_id: category === "empresa" ? companyId || null : null,
          publish,
        },
      });
    },
    onSuccess: (row) => {
      toast.success(row.status === "published" ? "Post publicado!" : "Rascunho salvo.");
      setDraft(null);
      setKeywords("");
      setExtra("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function updateDraft(patch: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function addTags() {
    if (!draft) return;
    const parts = tagsInput.split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
    if (!parts.length) return;
    updateDraft({ tags: Array.from(new Set([...(draft.tags ?? []), ...parts])) });
    setTagsInput("");
  }

  const contentLen = draft?.content.length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Gerador IA — Blog
          </h1>
          <p className="text-sm text-muted-foreground">
            Gere rascunhos otimizados para SEO com IA e publique diretamente em <Link to="/admin/blog" className="underline">/admin/blog</Link>.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Formulário */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <Label>Palavras-chave (separadas por vírgula, a 1ª é principal)</Label>
            <Textarea rows={2} value={keywords} onChange={(e) => setKeywords(e.target.value)}
              placeholder="ex: agendar consulta UBS Vespasiano, saúde pública" />
          </div>

          <div>
            <Label>Categoria</Label>
            <div className="mt-2 grid gap-2">
              {CATS.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                    className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                      active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}>
                    <Icon className={`h-5 w-5 mt-0.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <div className="text-sm font-medium">{c.label}</div>
                      <div className="text-xs text-muted-foreground">{c.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Cidade (opcional)</Label>
            <select value={cityId} onChange={(e) => setCityId(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">— nenhuma —</option>
              {cities?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.state ? ` - ${c.state}` : ""}</option>
              ))}
            </select>
          </div>

          {category === "empresa" && (
            <div>
              <Label>Empresa</Label>
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="">— selecione —</option>
                {companies?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Contexto extra (opcional)</Label>
            <Textarea rows={3} value={extra} onChange={(e) => setExtra(e.target.value)}
              placeholder="Ex: destacar horário de atendimento, público-alvo..." />
          </div>

          <Button className="w-full gap-2" onClick={() => generate.mutate()}
            disabled={generate.isPending || keywords.trim().length < 2 || (category === "empresa" && !companyId)}>
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generate.isPending ? "Gerando…" : "Gerar rascunho com IA"}
          </Button>
        </div>

        {/* Preview / Editor */}
        <div className="rounded-xl border border-border bg-card p-4">
          {!draft ? (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center text-center text-muted-foreground">
              <Sparkles className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm">Preencha o formulário e clique em <strong>Gerar rascunho</strong>.</p>
              <p className="mt-1 text-xs">A IA usa contexto local (cidade/empresa) para escrever conteúdo relevante.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">{contentLen.toLocaleString("pt-BR")} caracteres</div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => save.mutate(false)} disabled={save.isPending}>
                    <Save className="h-4 w-4" /> Salvar rascunho
                  </Button>
                  <Button size="sm" className="gap-1" onClick={() => save.mutate(true)} disabled={save.isPending}>
                    <Send className="h-4 w-4" /> Publicar agora
                  </Button>
                </div>
              </div>

              <div>
                <Label>Título</Label>
                <Input value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={draft.slug} onChange={(e) => updateDraft({ slug: e.target.value })} />
              </div>
              <div>
                <Label>Resumo</Label>
                <Textarea rows={2} value={draft.excerpt} onChange={(e) => updateDraft({ excerpt: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Meta title</Label>
                  <Input value={draft.meta_title} onChange={(e) => updateDraft({ meta_title: e.target.value })} />
                </div>
                <div>
                  <Label>Meta description</Label>
                  <Input value={draft.meta_description} onChange={(e) => updateDraft({ meta_description: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Tags</Label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {draft.tags.map((t) => (
                    <button key={t} type="button" onClick={() => updateDraft({ tags: draft.tags.filter((x) => x !== t) })}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                      {t} <span aria-hidden>×</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input placeholder="nova tag" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTags(); } }} />
                  <Button type="button" variant="secondary" onClick={addTags}>Adicionar</Button>
                </div>
              </div>
              <div>
                <Label>Conteúdo (Markdown)</Label>
                <Textarea rows={20} value={draft.content} onChange={(e) => updateDraft({ content: e.target.value })} className="font-mono text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

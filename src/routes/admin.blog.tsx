import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Eye, EyeOff, ExternalLink, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/blog")({
  head: () => ({ meta: [{ title: "Blog — Admin AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: AdminBlog,
});

const MIN_CONTENT_CHARS = 3000;
const META_DESC_MIN = 120;
const META_DESC_MAX = 160;
const TITLE_MAX = 60;

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  cover_url: string | null;
  author_name: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  keywords: string[] | null;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").slice(0, 80);
}

async function fetchAll(): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, excerpt, content, featured_image, author_name, status, published_at, created_at, meta_title, meta_description, og_image, tags")
    .eq("type", "blog")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    content: r.content,
    cover_url: r.featured_image,
    author_name: r.author_name,
    published: r.status === "published",
    published_at: r.published_at,
    created_at: r.created_at,
    meta_title: r.meta_title,
    meta_description: r.meta_description,
    og_image: r.og_image,
    keywords: r.tags ?? [],
  })) as Post[];
}

function keywordDensity(content: string, keywords: string[]) {
  const lower = content.toLowerCase();
  return keywords.map((k) => {
    const kw = k.trim().toLowerCase();
    if (!kw) return { kw: k, count: 0 };
    const matches = lower.split(kw).length - 1;
    return { kw, count: matches };
  });
}

function AdminBlog() {
  const qc = useQueryClient();
  const { data: posts, isLoading } = useQuery({ queryKey: ["admin-blog-posts"], queryFn: fetchAll });
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");

  const content = editing?.content ?? "";
  const contentLen = content.length;
  const contentWords = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.round(contentWords / 220));
  const metaLen = (editing?.meta_description ?? "").length;
  const titleLen = (editing?.title ?? "").length;
  const kws = editing?.keywords ?? [];
  const densities = useMemo(() => keywordDensity(content, kws), [content, kws]);
  const primaryKw = kws[0]?.toLowerCase() ?? "";
  const primaryInTitle = !!primaryKw && (editing?.title ?? "").toLowerCase().includes(primaryKw);
  const primaryInExcerpt = !!primaryKw && (editing?.excerpt ?? "").toLowerCase().includes(primaryKw);
  const primaryInMeta = !!primaryKw && (editing?.meta_description ?? "").toLowerCase().includes(primaryKw);

  const checks: { ok: boolean; label: string; hint?: string }[] = [
    { ok: contentLen >= MIN_CONTENT_CHARS, label: `Conteúdo com ${contentLen.toLocaleString("pt-BR")} / ${MIN_CONTENT_CHARS.toLocaleString("pt-BR")} caracteres`, hint: "Amplie exemplos, contexto e passo a passo." },
    { ok: titleLen > 0 && titleLen <= TITLE_MAX, label: `Título com ${titleLen}/${TITLE_MAX} caracteres`, hint: "Títulos de até 60 caracteres aparecem completos no Google." },
    { ok: metaLen >= META_DESC_MIN && metaLen <= META_DESC_MAX, label: `Meta description ${metaLen}/${META_DESC_MIN}–${META_DESC_MAX}`, hint: "Resuma o valor do post em 120–160 caracteres." },
    { ok: kws.length >= 3, label: `${kws.length} palavras-chave (mínimo 3)`, hint: "Inclua uma principal e variações relacionadas." },
    { ok: primaryInTitle, label: "Palavra-chave principal aparece no título" },
    { ok: primaryInExcerpt, label: "Palavra-chave principal aparece no resumo" },
    { ok: primaryInMeta, label: "Palavra-chave principal aparece na meta description" },
    { ok: /##\s/.test(content), label: "Contém pelo menos um subtítulo (## H2)", hint: "Estruture o texto com subtítulos para escaneabilidade." },
    { ok: (editing?.cover_url ?? "").length > 0, label: "Imagem de capa definida" },
  ];
  const okCount = checks.filter((c) => c.ok).length;

  function addKeywordsFromInput() {
    const parts = keywordsInput.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = Array.from(new Set([...(editing?.keywords ?? []), ...parts]));
    setEditing({ ...editing!, keywords: next });
    setKeywordsInput("");
  }
  function removeKeyword(k: string) {
    setEditing({ ...editing!, keywords: (editing?.keywords ?? []).filter((x) => x !== k) });
  }

  async function save(p: Partial<Post>) {
    const title = (p.title ?? "").trim();
    const slug = (p.slug ?? slugify(title)).trim();
    const contentStr = (p.content ?? "").trim();
    if (!title || !slug) return toast.error("Título e slug são obrigatórios");
    if (p.published && contentStr.length < MIN_CONTENT_CHARS) {
      return toast.error(`Para publicar, o conteúdo precisa ter no mínimo ${MIN_CONTENT_CHARS} caracteres (atual: ${contentStr.length}).`);
    }
    const payload = {
      type: "blog" as const,
      slug,
      title,
      excerpt: p.excerpt || null,
      content: contentStr,
      featured_image: p.cover_url || null,
      author_name: p.author_name || "Equipe AgendaAqui",
      status: (p.published ? "published" : "draft") as "published" | "draft",
      published_at: p.published ? (p.published_at ?? new Date().toISOString()) : null,
      meta_title: p.meta_title || null,
      meta_description: p.meta_description || null,
      og_image: p.og_image || p.cover_url || null,
      tags: p.keywords ?? [],
    };
    const q = p.id
      ? supabase.from("posts").update(payload).eq("id", p.id)
      : supabase.from("posts").insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(p.id ? "Post atualizado" : "Post criado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    qc.invalidateQueries({ queryKey: ["blog-posts"] });
  }

  async function togglePublish(p: Post) {
    if (!p.published && (p.content?.length ?? 0) < MIN_CONTENT_CHARS) {
      return toast.error(`Conteúdo com ${p.content?.length ?? 0}/${MIN_CONTENT_CHARS} caracteres. Amplie o texto antes de publicar.`);
    }
    const { error } = await supabase.from("posts").update({
      status: !p.published ? "published" : "draft",
      published_at: !p.published ? (p.published_at ?? new Date().toISOString()) : p.published_at,
    }).eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success(!p.published ? "Publicado" : "Despublicado");
    qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    qc.invalidateQueries({ queryKey: ["blog-posts"] });
  }

  async function remove(p: Post) {
    if (!confirm(`Excluir "${p.title}"?`)) return;
    const { error } = await supabase.from("posts").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Post excluído");
    qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    qc.invalidateQueries({ queryKey: ["blog-posts"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Blog</h1>
          <p className="text-sm text-muted-foreground">Crie, edite e publique artigos otimizados para SEO (mínimo {MIN_CONTENT_CHARS.toLocaleString("pt-BR")} caracteres).</p>
        </div>
        <Button onClick={() => { setEditing({ published: false, author_name: "Equipe AgendaAqui", keywords: [] }); setKeywordsInput(""); }} className="gap-1">
          <Plus className="h-4 w-4" /> Novo post
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Caracteres</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Publicado em</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
            ) : !posts?.length ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum post ainda.</td></tr>
            ) : posts.map((p) => {
              const len = p.content?.length ?? 0;
              const ok = len >= MIN_CONTENT_CHARS;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-[420px]">{p.title}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[420px]">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"}`}>
                      {len.toLocaleString("pt-BR")} / {MIN_CONTENT_CHARS.toLocaleString("pt-BR")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${p.published ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-muted text-muted-foreground"}`}>
                      {p.published ? "Publicado" : "Rascunho"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {p.published && (
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">
                          <Button variant="ghost" size="icon" title="Ver"><ExternalLink className="h-4 w-4" /></Button>
                        </a>
                      )}
                      <Button variant="ghost" size="icon" title={p.published ? "Despublicar" : "Publicar"} onClick={() => togglePublish(p)}>
                        {p.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => { setEditing(p); setKeywordsInput(""); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar post" : "Novo post"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <Label>Título</Label>
                  <span className={`text-xs ${titleLen > TITLE_MAX ? "text-destructive" : "text-muted-foreground"}`}>{titleLen}/{TITLE_MAX}</span>
                </div>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value, slug: editing.id ? editing.slug : slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Resumo (excerpt)</Label>
                <Textarea rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> SEO</div>
                <div>
                  <Label className="text-xs">Meta title (opcional — usa o título se vazio)</Label>
                  <Input value={editing.meta_title ?? ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Meta description</Label>
                    <span className={`text-xs ${metaLen && (metaLen < META_DESC_MIN || metaLen > META_DESC_MAX) ? "text-destructive" : "text-muted-foreground"}`}>{metaLen}/{META_DESC_MIN}–{META_DESC_MAX}</span>
                  </div>
                  <Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Palavras-chave (a primeira é a principal)</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(editing.keywords ?? []).map((k, i) => (
                      <button key={k} type="button" onClick={() => removeKeyword(k)} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${i === 0 ? "bg-primary/15 text-primary" : "bg-muted text-foreground"}`}>
                        {k} <span aria-hidden>×</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input placeholder="separe por vírgula e pressione Adicionar" value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeywordsFromInput(); } }} />
                    <Button type="button" variant="secondary" onClick={addKeywordsFromInput}>Adicionar</Button>
                  </div>
                  {kws.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Ocorrências no conteúdo: {densities.map((d) => `${d.kw} (${d.count})`).join(" · ")}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label>Conteúdo (Markdown)</Label>
                  <span className={`text-xs ${contentLen < MIN_CONTENT_CHARS ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                    {contentLen.toLocaleString("pt-BR")} caracteres · {contentWords.toLocaleString("pt-BR")} palavras · ~{readMinutes} min de leitura
                  </span>
                </div>
                <Textarea rows={16} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} />
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full transition-all ${contentLen >= MIN_CONTENT_CHARS ? "bg-green-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (contentLen / MIN_CONTENT_CHARS) * 100)}%` }} />
                </div>
                {contentLen < MIN_CONTENT_CHARS && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Faltam {(MIN_CONTENT_CHARS - contentLen).toLocaleString("pt-BR")} caracteres para atingir o mínimo recomendado.</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>URL da capa</Label>
                  <Input value={editing.cover_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} />
                </div>
                <div>
                  <Label>Autor</Label>
                  <Input value={editing.author_name ?? ""} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} />
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Checklist de qualidade</span>
                  <span className="text-xs text-muted-foreground">{okCount}/{checks.length}</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-start gap-2">
                      {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" /> : <AlertCircle className="mt-0.5 h-4 w-4 text-amber-600" />}
                      <span>
                        <span className={c.ok ? "text-foreground" : "text-foreground/80"}>{c.label}</span>
                        {!c.ok && c.hint && <span className="ml-1 text-xs text-muted-foreground">— {c.hint}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={!!editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
                <Label className="!m-0">Publicado {contentLen < MIN_CONTENT_CHARS && <span className="text-xs text-muted-foreground">(requer {MIN_CONTENT_CHARS.toLocaleString("pt-BR")}+ caracteres)</span>}</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && save(editing)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, CalendarDays, Filter, Copy as CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/calendario-editorial")({
  head: () => ({ meta: [{ title: "Calendário Editorial — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminCalendarioEditorial,
});

interface Post {
  id: string;
  publish_date: string;
  theme: string;
  format: string;
  caption: string;
  status: "planejado" | "producao" | "agendado" | "publicado" | "cancelado";
  campaign: string | null;
  city: string | null;
  tags: string[] | null;
  notes: string | null;
}

const STATUS_LABEL: Record<Post["status"], string> = {
  planejado: "Planejado",
  producao: "Em produção",
  agendado: "Agendado",
  publicado: "Publicado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<Post["status"], string> = {
  planejado: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
  producao: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  agendado: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  publicado: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  cancelado: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

const FORMATOS = ["Reels", "Carrossel", "Card estático", "Stories", "Live", "Vídeo longo"];

async function fetchPosts(month: string): Promise<Post[]> {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1).toISOString().slice(0, 10);
  const end = new Date(y, m, 0).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("editorial_posts")
    .select("*")
    .gte("publish_date", start)
    .lte("publish_date", end)
    .order("publish_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Post[];
}

type FormState = Omit<Post, "id"> & { id?: string };

const emptyForm: FormState = {
  publish_date: new Date().toISOString().slice(0, 10),
  theme: "",
  format: "Reels",
  caption: "",
  status: "planejado",
  campaign: "",
  city: "",
  tags: [],
  notes: "",
};

function AdminCalendarioEditorial() {
  const qc = useQueryClient();
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["editorial_posts", month],
    queryFn: () => fetchPosts(month),
  });

  const filtered = useMemo(() => {
    if (statusFilter === "all") return posts;
    return posts.filter((p) => p.status === statusFilter);
  }, [posts, statusFilter]);

  const stats = useMemo(() => {
    const acc = { total: posts.length, planejado: 0, producao: 0, agendado: 0, publicado: 0, cancelado: 0 };
    for (const p of posts) acc[p.status] += 1;
    return acc;
  }, [posts]);

  function openNew() {
    setForm({ ...emptyForm, publish_date: `${month}-01` });
    setDialogOpen(true);
  }

  function openEdit(p: Post) {
    setForm({ ...p, campaign: p.campaign ?? "", city: p.city ?? "", notes: p.notes ?? "", tags: p.tags ?? [] });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.theme.trim() || !form.caption.trim()) {
      toast.error("Preencha tema e legenda.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        publish_date: form.publish_date,
        theme: form.theme.trim(),
        format: form.format,
        caption: form.caption.trim(),
        status: form.status,
        campaign: form.campaign?.trim() || null,
        city: form.city?.trim() || null,
        tags: form.tags ?? [],
        notes: form.notes?.trim() || null,
      };
      if (form.id) {
        const { error } = await supabase.from("editorial_posts").update(payload).eq("id", form.id);
        if (error) throw error;
        toast.success("Post atualizado.");
      } else {
        const { error } = await supabase.from("editorial_posts").insert(payload);
        if (error) throw error;
        toast.success("Post criado.");
      }
      setDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["editorial_posts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este post?")) return;
    const { error } = await supabase.from("editorial_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Excluído.");
    qc.invalidateQueries({ queryKey: ["editorial_posts"] });
  }

  async function handleStatusChange(id: string, status: Post["status"]) {
    const { error } = await supabase.from("editorial_posts").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["editorial_posts"] });
  }

  async function copyCaption(caption: string) {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Legenda copiada.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <CalendarDays className="h-7 w-7 text-primary" />
            Calendário Editorial
          </h1>
          <p className="text-sm text-muted-foreground">
            Planeje, produza e acompanhe os posts do mês. Ideias, ganchos, formatos e CTAs num só lugar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-[160px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as Post["status"][]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo post
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          { label: "Total", value: stats.total, color: "bg-primary/10 text-primary" },
          { label: "Planejados", value: stats.planejado, color: STATUS_COLOR.planejado },
          { label: "Em produção", value: stats.producao, color: STATUS_COLOR.producao },
          { label: "Agendados", value: stats.agendado, color: STATUS_COLOR.agendado },
          { label: "Publicados", value: stats.publicado, color: STATUS_COLOR.publicado },
          { label: "Cancelados", value: stats.cancelado, color: STATUS_COLOR.cancelado },
        ].map((s) => (
          <div key={s.label} className={`rounded-lg border p-3 ${s.color}`}>
            <div className="text-xs font-medium opacity-80">{s.label}</div>
            <div className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhum post neste mês. Clique em <strong>Novo post</strong> para começar.
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((p) => {
              const date = new Date(`${p.publish_date}T12:00:00`);
              const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" });
              const day = date.getDate().toString().padStart(2, "0");
              return (
                <li key={p.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
                  <div className="flex w-full items-start gap-3 md:w-32 md:flex-col md:items-center md:text-center">
                    <div className="rounded-md border bg-background px-3 py-2">
                      <div className="text-[10px] font-medium uppercase text-muted-foreground">{weekday}</div>
                      <div className="text-2xl font-bold leading-none">{day}</div>
                    </div>
                    <Badge variant="outline" className="md:mt-1">{p.format}</Badge>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{p.theme}</h3>
                      {p.campaign && <Badge variant="secondary">{p.campaign}</Badge>}
                      {p.city && <Badge variant="outline">{p.city}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.caption}</p>
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-stretch gap-2 md:w-52">
                    <Select value={p.status} onValueChange={(v) => handleStatusChange(p.id, v as Post["status"])}>
                      <SelectTrigger className={`text-xs ${STATUS_COLOR[p.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(STATUS_LABEL) as Post["status"][]).map((s) => (
                          <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => copyCaption(p.caption)}>
                        <CopyIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar post" : "Novo post"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Data de publicação</Label>
              <Input type="date" value={form.publish_date} onChange={(e) => setForm({ ...form, publish_date: e.target.value })} />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FORMATOS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Tema / Gancho</Label>
              <Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} placeholder="Ex.: Antes/Depois de banco de tecido" />
            </div>
            <div className="md:col-span-2">
              <Label>Legenda / CTA</Label>
              <Textarea rows={4} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Sugestão de legenda com CTA" />
            </div>
            <div>
              <Label>Campanha (opcional)</Label>
              <Input value={form.campaign ?? ""} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="Ex.: Agosto Lilás" />
            </div>
            <div>
              <Label>Cidade (opcional)</Label>
              <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ex.: Vespasiano" />
            </div>
            <div className="md:col-span-2">
              <Label>Tags (separadas por vírgula)</Label>
              <Input
                value={(form.tags ?? []).join(", ")}
                onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="dor, antes-depois, sazonal"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Post["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as Post["status"][]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Observações internas (opcional)</Label>
              <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

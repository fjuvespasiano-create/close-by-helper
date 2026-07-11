import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { EventRow, ShowRow, EventCategory } from "@/lib/events";
import { fetchEventCategories } from "@/lib/events";

export const Route = createFileRoute("/admin/eventos")({
  head: () => ({ meta: [{ title: "Eventos — Admin AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: AdminEventos,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").slice(0,80);
}
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso); const pad = (n: number) => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) { return v ? new Date(v).toISOString() : ""; }

async function fetchAllEvents(): Promise<EventRow[]> {
  const { data, error } = await (supabase.from("events") as any)
    .select("*").order("start_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

function AdminEventos() {
  const qc = useQueryClient();
  const events = useQuery({ queryKey: ["admin-events"], queryFn: fetchAllEvents });
  const cats = useQuery({ queryKey: ["event-categories"], queryFn: fetchEventCategories });
  const [editing, setEditing] = useState<Partial<EventRow> | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function saveEvent(e: Partial<EventRow>) {
    if (!e.title) return toast.error("Título é obrigatório");
    if (!e.start_at) return toast.error("Data/hora de início é obrigatória");
    const payload = {
      slug: e.slug || slugify(e.title),
      title: e.title,
      description: e.description || null,
      cover_image: e.cover_image || null,
      location: e.location || null,
      start_at: e.start_at,
      end_at: e.end_at || null,
      status: e.status || "draft",
      event_type: e.event_type || null,
      category_id: e.category_id || null,
      ticket_url: e.ticket_url || null,
      price_min: e.price_min ?? null,
      price_max: e.price_max ?? null,
    };
    const q = e.id
      ? (supabase.from("events") as any).update(payload).eq("id", e.id)
      : (supabase.from("events") as any).insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(e.id ? "Evento atualizado" : "Evento criado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-events"] });
    qc.invalidateQueries({ queryKey: ["events"] });
  }

  async function removeEvent(e: EventRow) {
    if (!confirm(`Excluir "${e.title}"? Todos os shows serão removidos.`)) return;
    const { error } = await (supabase.from("events") as any).delete().eq("id", e.id);
    if (error) return toast.error(error.message);
    toast.success("Evento excluído");
    qc.invalidateQueries({ queryKey: ["admin-events"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold">Eventos</h1>
          <p className="text-sm text-muted-foreground">Gerencie eventos, shows e categorias.</p>
        </div>
        <Button onClick={() => setEditing({ status: "draft", start_at: new Date().toISOString() })} className="gap-1">
          <Plus className="h-4 w-4" /> Novo evento
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {events.isLoading ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : !events.data?.length ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum evento ainda.</div>
        ) : events.data.map((e) => (
          <div key={e.id} className="rounded-xl border border-border bg-card">
            <div className="flex flex-wrap items-center gap-3 p-4">
              <button className="text-muted-foreground" onClick={() => setExpanded(expanded === e.id ? null : e.id)} aria-label="Ver shows">
                {expanded === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate font-medium">{e.title}</div>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${e.status === "published" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200" : "bg-muted text-muted-foreground"}`}>
                    {e.status}
                  </span>
                  {e.event_type && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{e.event_type}</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(e.start_at).toLocaleString("pt-BR")}</span>
                  {e.location && <span>· {e.location}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" title="Editar" onClick={() => setEditing(e)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" title="Excluir" onClick={() => removeEvent(e)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            {expanded === e.id && <ShowsPanel eventId={e.id} />}
          </div>
        ))}
      </div>

      <EventDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSave={saveEvent}
        categories={cats.data ?? []}
      />
    </div>
  );
}

function EventDialog({ editing, onClose, onSave, categories }:{
  editing: Partial<EventRow> | null; onClose: () => void; onSave: (e: Partial<EventRow>) => void; categories: EventCategory[];
}) {
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing?.id ? "Editar evento" : "Novo evento"}</DialogTitle></DialogHeader>
        {editing && (
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={editing.title ?? ""} onChange={(ev) => Object.assign(editing, { title: ev.target.value, slug: editing.id ? editing.slug : slugify(ev.target.value) })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Slug</Label>
                <Input value={editing.slug ?? ""} onChange={(ev) => Object.assign(editing, { slug: slugify(ev.target.value) })} />
              </div>
              <div>
                <Label>Tipo (ex.: Show, Festival)</Label>
                <Input value={editing.event_type ?? ""} onChange={(ev) => Object.assign(editing, { event_type: ev.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Início</Label>
                <Input type="datetime-local" defaultValue={toLocalInput(editing.start_at)} onChange={(ev) => Object.assign(editing, { start_at: fromLocalInput(ev.target.value) })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="datetime-local" defaultValue={toLocalInput(editing.end_at)} onChange={(ev) => Object.assign(editing, { end_at: fromLocalInput(ev.target.value) || null })} />
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input value={editing.location ?? ""} onChange={(ev) => Object.assign(editing, { location: ev.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea rows={5} defaultValue={editing.description ?? ""} onChange={(ev) => Object.assign(editing, { description: ev.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Categoria</Label>
                <Select defaultValue={editing.category_id ?? "none"} onValueChange={(v) => Object.assign(editing, { category_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhuma —</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>URL da capa</Label>
                <Input value={editing.cover_image ?? ""} onChange={(ev) => Object.assign(editing, { cover_image: ev.target.value })} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Preço mín.</Label>
                <Input type="number" step="0.01" defaultValue={editing.price_min ?? ""} onChange={(ev) => Object.assign(editing, { price_min: ev.target.value ? Number(ev.target.value) : null })} />
              </div>
              <div>
                <Label>Preço máx.</Label>
                <Input type="number" step="0.01" defaultValue={editing.price_max ?? ""} onChange={(ev) => Object.assign(editing, { price_max: ev.target.value ? Number(ev.target.value) : null })} />
              </div>
              <div>
                <Label>URL de ingressos</Label>
                <Input value={editing.ticket_url ?? ""} onChange={(ev) => Object.assign(editing, { ticket_url: ev.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch defaultChecked={editing.status === "published"} onCheckedChange={(v) => Object.assign(editing, { status: v ? "published" : "draft" })} />
              <Label className="!m-0">Publicado</Label>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => editing && onSave(editing)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShowsPanel({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const shows = useQuery({
    queryKey: ["admin-event-shows", eventId],
    queryFn: async (): Promise<ShowRow[]> => {
      const { data, error } = await (supabase.from("shows") as any).select("*").eq("event_id", eventId).order("start_at");
      if (error) throw error;
      return (data ?? []) as ShowRow[];
    },
  });
  const [editing, setEditing] = useState<Partial<ShowRow> | null>(null);

  async function save(s: Partial<ShowRow>) {
    if (!s.artist_name) return toast.error("Nome da atração é obrigatório");
    if (!s.start_at) return toast.error("Horário é obrigatório");
    const payload = {
      event_id: eventId,
      artist_name: s.artist_name,
      description: s.description || null,
      start_at: s.start_at,
      end_at: s.end_at || null,
      stage: s.stage || null,
      cover_image: s.cover_image || null,
      ticket_url: s.ticket_url || null,
      ticket_price: s.ticket_price ?? null,
      sort: s.sort ?? 0,
    };
    const q = s.id
      ? (supabase.from("shows") as any).update(payload).eq("id", s.id)
      : (supabase.from("shows") as any).insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success(s.id ? "Show atualizado" : "Show adicionado");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-event-shows", eventId] });
  }

  async function remove(s: ShowRow) {
    if (!confirm(`Remover "${s.artist_name}"?`)) return;
    const { error } = await (supabase.from("shows") as any).delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Show removido");
    qc.invalidateQueries({ queryKey: ["admin-event-shows", eventId] });
  }

  return (
    <div className="border-t border-border bg-muted/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Shows / atrações</h4>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setEditing({ start_at: new Date().toISOString() })}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>
      {shows.isLoading ? (
        <div className="h-16 animate-pulse rounded-md bg-muted" />
      ) : !shows.data?.length ? (
        <p className="text-sm text-muted-foreground">Nenhum show ainda.</p>
      ) : (
        <ul className="space-y-2">
          {shows.data.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.artist_name}{s.stage ? ` · ${s.stage}` : ""}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.start_at).toLocaleString("pt-BR")}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(s)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar show" : "Novo show"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div><Label>Nome da atração / artista</Label>
                <Input value={editing.artist_name ?? ""} onChange={(ev) => Object.assign(editing, { artist_name: ev.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Início</Label>
                  <Input type="datetime-local" defaultValue={toLocalInput(editing.start_at)} onChange={(ev) => Object.assign(editing, { start_at: fromLocalInput(ev.target.value) })} /></div>
                <div><Label>Fim</Label>
                  <Input type="datetime-local" defaultValue={toLocalInput(editing.end_at)} onChange={(ev) => Object.assign(editing, { end_at: fromLocalInput(ev.target.value) || null })} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Palco</Label>
                  <Input value={editing.stage ?? ""} onChange={(ev) => Object.assign(editing, { stage: ev.target.value })} /></div>
                <div><Label>Preço ingresso</Label>
                  <Input type="number" step="0.01" defaultValue={editing.ticket_price ?? ""} onChange={(ev) => Object.assign(editing, { ticket_price: ev.target.value ? Number(ev.target.value) : null })} /></div>
              </div>
              <div><Label>URL da imagem</Label>
                <Input value={editing.cover_image ?? ""} onChange={(ev) => Object.assign(editing, { cover_image: ev.target.value })} /></div>
              <div><Label>URL de ingresso</Label>
                <Input value={editing.ticket_url ?? ""} onChange={(ev) => Object.assign(editing, { ticket_url: ev.target.value })} /></div>
              <div><Label>Descrição</Label>
                <Textarea rows={3} defaultValue={editing.description ?? ""} onChange={(ev) => Object.assign(editing, { description: ev.target.value })} /></div>
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

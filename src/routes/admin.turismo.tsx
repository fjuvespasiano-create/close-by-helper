import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Compass, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/turismo")({
  head: () => ({ meta: [{ title: "Turismo — Admin AgenddaAqui" }, { name: "robots", content: "noindex" }] }),
  component: AdminTurismo,
});

interface Attraction {
  id: string;
  title: string;
  slug: string | null;
  description: string;
  category: string;
  city_id: string | null;
  image_url: string | null;
  link_url: string | null;
  meta: string | null;
  tag: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface City {
  id: string;
  name: string;
  slug: string;
}

const CATEGORIAS = [
  { value: "aventura", label: "Adrenalina e Esporte" },
  { value: "familia", label: "Família e Lazer" },
  { value: "gastronomia", label: "Roteiro Gastronômico" },
  { value: "historia", label: "História e Cultura" },
  { value: "natureza", label: "Ecoturismo e Natureza" },
  { value: "eventos", label: "Eventos Locais" },
  { value: "geral", label: "Geral" },
];

async function fetchAttractions(): Promise<Attraction[]> {
  const { data, error } = await supabase
    .from("tourist_attractions")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Attraction[];
}

async function fetchCities(): Promise<City[]> {
  const { data, error } = await supabase
    .from("cities")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as City[];
}

type FormState = Omit<Attraction, "id" | "created_at" | "slug"> & { id?: string };

const emptyForm: FormState = {
  title: "",
  description: "",
  category: "geral",
  city_id: null,
  image_url: "",
  link_url: "",
  meta: "",
  tag: "",
  sort_order: 0,
  is_active: true,
};

function AdminTurismo() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({ queryKey: ["admin-tourist-attractions"], queryFn: fetchAttractions });
  const { data: cities = [] } = useQuery({ queryKey: ["admin-cities-simple"], queryFn: fetchCities });
  const [editing, setEditing] = useState<FormState | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta atração?")) return;
    const { error } = await supabase.from("tourist_attractions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atração excluída");
    qc.invalidateQueries({ queryKey: ["admin-tourist-attractions"] });
    qc.invalidateQueries({ queryKey: ["tourist-attractions"] });
  }

  async function handleToggle(row: Attraction) {
    const { error } = await supabase
      .from("tourist_attractions")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-tourist-attractions"] });
    qc.invalidateQueries({ queryKey: ["tourist-attractions"] });
  }

  async function handleSave(form: FormState) {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      city_id: form.city_id || null,
      image_url: form.image_url?.trim() || null,
      link_url: form.link_url?.trim() || null,
      meta: form.meta?.trim() || null,
      tag: form.tag?.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    if (!payload.title || !payload.description) {
      toast.error("Título e descrição são obrigatórios");
      return;
    }
    const { error } = form.id
      ? await supabase.from("tourist_attractions").update(payload).eq("id", form.id)
      : await supabase.from("tourist_attractions").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(form.id ? "Atração atualizada" : "Atração criada");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-tourist-attractions"] });
    qc.invalidateQueries({ queryKey: ["tourist-attractions"] });
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Atrações turísticas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre e edite atrações exibidas em <code>/roteiro-turistico</code>.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...emptyForm })}>
          <Plus className="mr-2 h-4 w-4" />
          Nova atração
        </Button>
      </div>

      <div className="mt-6 rounded-lg border">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhuma atração cadastrada. Clique em "Nova atração" para começar.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((row) => {
              const city = cities.find((c) => c.id === row.city_id);
              const cat = CATEGORIAS.find((c) => c.value === row.category);
              return (
                <div key={row.id} className="flex items-center gap-4 p-4">
                  {row.image_url && (
                    <img
                      src={row.image_url}
                      alt=""
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{row.title}</h3>
                      {!row.is_active && <Badge variant="outline">Inativa</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{cat?.label ?? row.category}</Badge>
                      {city && <span>📍 {city.name}</span>}
                      {row.tag && <span>#{row.tag}</span>}
                      <span>ordem: {row.sort_order}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleToggle(row)} title={row.is_active ? "Desativar" : "Ativar"}>
                      {row.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditing({ ...row, id: row.id })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <EditDialog
          form={editing}
          cities={cities}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function EditDialog({
  form: initial,
  cities,
  onClose,
  onSave,
}: {
  form: FormState;
  cities: City[];
  onClose: () => void;
  onSave: (f: FormState) => void | Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(initial);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar atração" : "Nova atração"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Gruta da Lapinha" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Descreva a atração para o visitante" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Cidade</Label>
              <Select
                value={form.city_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, city_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Todas as cidades" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas as cidades</SelectItem>
                  {cities.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image_url">URL da imagem</Label>
            <Input id="image_url" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link_url">Link externo (mais info)</Label>
            <Input id="link_url" value={form.link_url ?? ""} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tag">Tag curta</Label>
              <Input id="tag" value={form.tag ?? ""} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Ecoturismo" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meta">Meta (distância, horários…)</Label>
              <Input id="meta" value={form.meta ?? ""} onChange={(e) => setForm({ ...form, meta: e.target.value })} placeholder="≈ 15 min do centro" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sort_order">Ordem</Label>
              <Input id="sort_order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Switch id="is_active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            <Label htmlFor="is_active" className="cursor-pointer">Publicada (visível para visitantes)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>{form.id ? "Salvar alterações" : "Criar atração"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, MousePointerClick, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/anuncios")({
  component: AdminAds,
});

type FormState = {
  id?: string;
  name: string;
  image_url: string;
  link_url: string;
  city_slug: string; // "" = todas
  placement: "bottom-right" | "bottom-center" | "center";
  delay_seconds: number;
  scroll_trigger_percent: number;
  display_seconds: number;
  weight: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  route_patterns: string; // textarea, uma rota por linha
  company_id: string; // "" = nenhuma
};

const empty: FormState = {
  name: "",
  image_url: "",
  link_url: "",
  city_slug: "",
  placement: "bottom-right",
  delay_seconds: 5,
  scroll_trigger_percent: 0,
  display_seconds: 7,
  weight: 1,
  starts_at: "",
  ends_at: "",
  active: true,
  route_patterns: "",
  company_id: "",
};

async function listCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,plan,status")
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

async function listAll() {
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function AdminAds() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-ads"], queryFn: listAll });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        image_url: form.image_url.trim(),
        link_url: form.link_url.trim(),
        city_slug: form.city_slug || null,
        placement: form.placement,
        delay_seconds: form.delay_seconds,
        scroll_trigger_percent: form.scroll_trigger_percent,
        display_seconds: form.display_seconds,
        weight: form.weight,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        active: form.active,
      };
      if (!payload.name || !payload.image_url || !payload.link_url) {
        throw new Error("Nome, imagem e link são obrigatórios");
      }
      if (form.id) {
        const { error } = await supabase.from("ad_campaigns").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ad_campaigns").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success(form.id ? "Campanha atualizada" : "Campanha criada");
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Campanha removida");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("ad_campaigns").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setForm(empty);
    setOpen(true);
  }

  function openEdit(row: Awaited<ReturnType<typeof listAll>>[number]) {
    setForm({
      id: row.id,
      name: row.name,
      image_url: row.image_url,
      link_url: row.link_url,
      city_slug: row.city_slug ?? "",
      placement: row.placement as FormState["placement"],
      delay_seconds: row.delay_seconds,
      scroll_trigger_percent: row.scroll_trigger_percent,
      display_seconds: row.display_seconds,
      weight: row.weight,
      starts_at: row.starts_at ? row.starts_at.slice(0, 16) : "",
      ends_at: row.ends_at ? row.ends_at.slice(0, 16) : "",
      active: row.active,
    });
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Anúncios locais</h1>
          <p className="text-sm text-muted-foreground">
            Modais patrocinados exibidos com delay e contagem regressiva. Cada usuário vê a mesma campanha, no máximo, uma vez a cada 12h.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Nova campanha
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Campanha</th>
              <th className="px-4 py-2">Cidade</th>
              <th className="px-4 py-2">Delay / Rolagem</th>
              <th className="px-4 py-2">Métricas</th>
              <th className="px-4 py-2">Ativo</th>
              <th className="px-4 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {list.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td>
              </tr>
            )}
            {!list.isLoading && !list.data?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhuma campanha cadastrada.
                </td>
              </tr>
            )}
            {list.data?.map((row) => {
              const ctr = row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(1) : "0";
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={row.image_url} alt="" className="h-12 w-12 rounded object-cover" />
                      <div>
                        <div className="font-medium">{row.name}</div>
                        <a href={row.link_url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                          {row.link_url}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{row.city_slug ?? "Todas"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.delay_seconds}s · {row.scroll_trigger_percent > 0 ? `${row.scroll_trigger_percent}% scroll` : "sem scroll"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-2"><Eye className="h-3 w-3" /> {row.impressions}</div>
                    <div className="flex items-center gap-2"><MousePointerClick className="h-3 w-3" /> {row.clicks} ({ctr}%)</div>
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={row.active} onCheckedChange={(v) => toggle.mutate({ id: row.id, active: v })} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Remover "${row.name}"?`)) del.mutate(row.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar campanha" : "Nova campanha"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nome interno</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Padaria Estrela — outubro" />
            </div>
            <div>
              <Label>URL da imagem (recomendado 320×250 ou vertical)</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
              {form.image_url && (
                <img src={form.image_url} alt="preview" className="mt-2 max-h-40 rounded border object-cover" />
              )}
            </div>
            <div>
              <Label>Link ao clicar (WhatsApp, Instagram, site…)</Label>
              <Textarea rows={2} value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://wa.me/55319…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cidade</Label>
                <Select value={form.city_slug || "all"} onValueChange={(v) => setForm({ ...form, city_slug: v === "all" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="vespasiano">Vespasiano</SelectItem>
                    <SelectItem value="sao-jose-da-lapa">São José da Lapa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Posição</Label>
                <Select value={form.placement} onValueChange={(v) => setForm({ ...form, placement: v as FormState["placement"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Canto inferior direito</SelectItem>
                    <SelectItem value="bottom-center">Rodapé centralizado</SelectItem>
                    <SelectItem value="center">Centro da tela</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Delay (s)</Label>
                <Input type="number" min={0} max={60} value={form.delay_seconds} onChange={(e) => setForm({ ...form, delay_seconds: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Rolagem (%)</Label>
                <Input type="number" min={0} max={100} value={form.scroll_trigger_percent} onChange={(e) => setForm({ ...form, scroll_trigger_percent: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Fecha em (s)</Label>
                <Input type="number" min={3} max={60} value={form.display_seconds} onChange={(e) => setForm({ ...form, display_seconds: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Peso</Label>
                <Input type="number" min={1} max={100} value={form.weight} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Início</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-sm">Ativa</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

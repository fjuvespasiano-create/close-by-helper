import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/cidades")({
  head: () => ({ meta: [{ title: "Admin — Cidades" }, { name: "robots", content: "noindex" }] }),
  component: AdminCidades,
});

type CityRow = Database["public"]["Tables"]["cities"]["Row"];
type CityUpdate = Database["public"]["Tables"]["cities"]["Update"];

async function fetchAllCities(): Promise<CityRow[]> {
  const { data, error } = await supabase.from("cities").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

function AdminCidades() {
  const qc = useQueryClient();
  const { data: cities = [], isLoading } = useQuery({ queryKey: ["admin-cities"], queryFn: fetchAllCities });
  const [editing, setEditing] = useState<CityRow | null>(null);
  const [form, setForm] = useState<CityUpdate>({});

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        slug: editing.slug,
        state: editing.state,
        lat: editing.lat,
        lng: editing.lng,
        hero_title: editing.hero_title,
        hero_subtitle: editing.hero_subtitle,
        hero_image_url: editing.hero_image_url,
        banner_url: editing.banner_url,
        logo_url: editing.logo_url,
        video_url: editing.video_url,
        primary_color: editing.primary_color,
        seo_title: editing.seo_title,
        seo_description: editing.seo_description,
        og_image_url: editing.og_image_url,
        is_active: editing.is_active,
      });
    }
  }, [editing]);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase.from("cities").update(form).eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cidade atualizada");
      qc.invalidateQueries({ queryKey: ["admin-cities"] });
      qc.invalidateQueries({ queryKey: ["cities"] });
      setEditing(null);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Cidades</h1>
        <p className="text-sm text-muted-foreground">Personalização (hero, banner, cores, SEO) por cidade.</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="grid gap-3">
          {cities.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-semibold">{c.name}</div>
                  <span className="text-xs text-muted-foreground">/{c.slug}</span>
                  {!c.is_active ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">Inativa</span>
                  ) : null}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.state}
                  {c.lat && c.lng ? ` · ${Number(c.lat).toFixed(3)}, ${Number(c.lng).toFixed(3)}` : ""}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(c)} className="gap-2">
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cidade</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nome">
                  <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Slug">
                  <Input value={form.slug ?? ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </Field>
                <Field label="Estado (UF)">
                  <Input value={form.state ?? ""} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </Field>
                <Field label="Cor primária (hex)">
                  <Input placeholder="#0057FF" value={form.primary_color ?? ""} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} />
                </Field>
                <Field label="Latitude">
                  <Input type="number" step="0.000001" value={form.lat ?? ""} onChange={(e) => setForm({ ...form, lat: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
                <Field label="Longitude">
                  <Input type="number" step="0.000001" value={form.lng ?? ""} onChange={(e) => setForm({ ...form, lng: e.target.value === "" ? null : Number(e.target.value) })} />
                </Field>
              </div>

              <Field label="Título do hero">
                <Input value={form.hero_title ?? ""} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} />
              </Field>
              <Field label="Subtítulo do hero">
                <Textarea rows={2} value={form.hero_subtitle ?? ""} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Imagem do hero (URL)">
                  <Input value={form.hero_image_url ?? ""} onChange={(e) => setForm({ ...form, hero_image_url: e.target.value })} />
                </Field>
                <Field label="Banner (URL)">
                  <Input value={form.banner_url ?? ""} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} />
                </Field>
                <Field label="Logo (URL)">
                  <Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
                </Field>
                <Field label="Vídeo YouTube (URL)">
                  <Input value={form.video_url ?? ""} onChange={(e) => setForm({ ...form, video_url: e.target.value })} />
                </Field>
              </div>

              <Field label="SEO title">
                <Input value={form.seo_title ?? ""} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              </Field>
              <Field label="SEO description">
                <Textarea rows={2} value={form.seo_description ?? ""} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
              </Field>
              <Field label="OG image (URL)">
                <Input value={form.og_image_url ?? ""} onChange={(e) => setForm({ ...form, og_image_url: e.target.value })} />
              </Field>

              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <div className="text-sm font-medium">Cidade ativa</div>
                  <div className="text-xs text-muted-foreground">Se desligada, some da detecção e do picker.</div>
                </div>
                <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="gap-2">
              <Save className="h-4 w-4" /> {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

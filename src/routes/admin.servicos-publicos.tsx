import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchCities } from "@/lib/queries";
import {
  PUBLIC_SERVICE_CATEGORIES,
  adminDeletePublicService,
  adminListAllPublicServices,
  adminUpsertPublicService,
  categoryLabel,
  type PublicService,
  type PublicServiceCategory,
} from "@/lib/publicServices";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/servicos-publicos")({
  component: AdminPublicServices,
});

type FormState = {
  id?: string;
  name: string;
  category: PublicServiceCategory;
  city_id: string;
  subtype: string;
  description: string;
  address: string;
  neighborhood: string;
  phone: string;
  phone_secondary: string;
  whatsapp: string;
  email: string;
  website: string;
  hours: string;
  is_24h: boolean;
  active: boolean;
  featured: boolean;
};

const empty: FormState = {
  name: "",
  category: "saude",
  city_id: "",
  subtype: "",
  description: "",
  address: "",
  neighborhood: "",
  phone: "",
  phone_secondary: "",
  whatsapp: "",
  email: "",
  website: "",
  hours: "",
  is_24h: false,
  active: true,
  featured: false,
};

function AdminPublicServices() {
  const qc = useQueryClient();
  const services = useQuery({ queryKey: ["admin-public-services"], queryFn: adminListAllPublicServices });
  const cities = useQuery({ queryKey: ["cities"], queryFn: fetchCities });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const upsert = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        subtype: form.subtype || null,
        description: form.description || null,
        address: form.address || null,
        neighborhood: form.neighborhood || null,
        phone: form.phone || null,
        phone_secondary: form.phone_secondary || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        website: form.website || null,
        hours: form.hours || null,
      };
      return adminUpsertPublicService(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-public-services"] });
      qc.invalidateQueries({ queryKey: ["public-services"] });
      toast.success(form.id ? "Serviço atualizado" : "Serviço criado");
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: adminDeletePublicService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-public-services"] });
      qc.invalidateQueries({ queryKey: ["public-services"] });
      toast.success("Serviço removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setForm({ ...empty, city_id: cities.data?.[0]?.id ?? "" });
    setOpen(true);
  };
  const openEdit = (s: PublicService) => {
    setForm({
      id: s.id,
      name: s.name,
      category: s.category,
      city_id: s.city_id,
      subtype: s.subtype ?? "",
      description: s.description ?? "",
      address: s.address ?? "",
      neighborhood: s.neighborhood ?? "",
      phone: s.phone ?? "",
      phone_secondary: s.phone_secondary ?? "",
      whatsapp: s.whatsapp ?? "",
      email: s.email ?? "",
      website: s.website ?? "",
      hours: s.hours ?? "",
      is_24h: s.is_24h,
      active: s.active,
      featured: s.featured,
    });
    setOpen(true);
  };

  const cityById = useMemo(() => new Map((cities.data ?? []).map((c) => [c.id, c.name])), [cities.data]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Serviços Públicos</h1>
          <p className="text-sm text-muted-foreground">Cadastre hospitais, escolas, secretarias e demais serviços da cidade.</p>
        </div>
        <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> Novo serviço</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(services.data ?? []).map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{categoryLabel(s.category)}</td>
                <td className="px-4 py-3 text-muted-foreground">{cityById.get(s.city_id) ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${s.active ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {s.active ? "Ativo" : "Inativo"}
                  </span>
                  {s.is_24h ? <span className="ml-1 rounded bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">24h</span> : null}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => { if (confirm("Remover este serviço?")) del.mutate(s.id); }}
                  ><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {services.data && services.data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Nenhum serviço cadastrado ainda.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar serviço" : "Novo serviço público"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as PublicServiceCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PUBLIC_SERVICE_CATEGORIES.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Cidade *</Label>
                <Select value={form.city_id} onValueChange={(v) => setForm({ ...form, city_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(cities.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Tipo (opcional, ex: UBS, Hospital, Delegacia)</Label>
              <Input value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Bairro</Label><Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Telefone secundário</Label><Input value={form.phone_secondary} onChange={(e) => setForm({ ...form, phone_secondary: e.target.value })} /></div>
              <div className="grid gap-2"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
              <div className="grid gap-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid gap-2"><Label>Site</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Horário de funcionamento</Label><Input placeholder="Seg-Sex 08h-17h" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2"><Switch checked={form.is_24h} onCheckedChange={(v) => setForm({ ...form, is_24h: v })} /> Atende 24h</label>
              <label className="flex items-center gap-2"><Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Destaque</label>
              <label className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Ativo</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!form.name || !form.city_id || upsert.isPending} onClick={() => upsert.mutate()}>
              {upsert.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchCities } from "@/lib/queries";
import {
  adminDeleteEmergencyContact,
  adminListAllEmergencyContacts,
  adminUpsertEmergencyContact,
  type EmergencyContact,
} from "@/lib/publicServices";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/emergencia")({
  component: AdminEmergency,
});

type FormState = {
  id?: string;
  name: string;
  phone: string;
  description: string;
  icon: string;
  city_id: string; // "" = national
  sort_order: number;
  active: boolean;
};

const empty: FormState = {
  name: "",
  phone: "",
  description: "",
  icon: "PhoneCall",
  city_id: "",
  sort_order: 100,
  active: true,
};

const ICONS = ["Ambulance", "Flame", "Shield", "Badge", "CloudRain", "PhoneCall", "Siren", "HeartPulse"];

function AdminEmergency() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin-emergency"], queryFn: adminListAllEmergencyContacts });
  const cities = useQuery({ queryKey: ["cities"], queryFn: fetchCities });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const upsert = useMutation({
    mutationFn: async () =>
      adminUpsertEmergencyContact({
        ...form,
        city_id: form.city_id === "" ? null : form.city_id,
        description: form.description || null,
        icon: form.icon || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast.success(form.id ? "Contato atualizado" : "Contato criado");
      setOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: adminDeleteEmergencyContact,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-emergency"] });
      qc.invalidateQueries({ queryKey: ["emergency-contacts"] });
      toast.success("Contato removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (c: EmergencyContact) => {
    setForm({
      id: c.id,
      name: c.name,
      phone: c.phone,
      description: c.description ?? "",
      icon: c.icon ?? "PhoneCall",
      city_id: c.city_id ?? "",
      sort_order: c.sort_order,
      active: c.active,
    });
    setOpen(true);
  };

  const cityById = useMemo(() => new Map((cities.data ?? []).map((c) => [c.id, c.name])), [cities.data]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Contatos de Emergência</h1>
          <p className="text-sm text-muted-foreground">Contatos sem cidade valem para todas (nacionais).</p>
        </div>
        <Button onClick={openNew} className="gap-1"><Plus className="h-4 w-4" /> Novo contato</Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Ordem</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(list.data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">{c.sort_order}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.city_id ? cityById.get(c.city_id) : "Todas (nacional)"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${c.active ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {c.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Editar contato" : "Novo contato de emergência"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Telefone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="192" /></div>
              <div className="grid gap-2"><Label>Ordem</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid gap-2"><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Ícone</Label>
                <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Cidade</Label>
                <Select value={form.city_id || "__all__"} onValueChange={(v) => setForm({ ...form, city_id: v === "__all__" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas (nacional)</SelectItem>
                    {(cities.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Ativo</label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button disabled={!form.name || !form.phone || upsert.isPending} onClick={() => upsert.mutate()}>
              {upsert.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

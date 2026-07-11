import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { createMyCompany, listCities } from "@/lib/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/painel/empresas/nova")({
  component: NovaEmpresa,
});

function NovaEmpresa() {
  const { userId } = useAdmin();
  const nav = useNavigate();
  const cities = useQuery({ queryKey: ["cities"], queryFn: listCities });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", tagline: "", description: "", city_id: "", phone: "", whatsapp: "", email: "", address: "" });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    if (!form.name.trim()) return toast.error("Informe o nome da empresa");
    setSaving(true);
    try {
      const c = await createMyCompany(userId, { ...form, city_id: form.city_id || null });
      toast.success("Empresa criada! Aguardando aprovação.");
      nav({ to: "/painel/empresas/$id", params: { id: c.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to="/painel/empresas" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Voltar</Link>
      <h1 className="font-display text-2xl font-bold">Nova empresa</h1>
      <p className="text-sm text-muted-foreground">Preencha as informações principais. Você poderá editar tudo depois.</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="tagline">Slogan / descrição curta</Label>
          <Input id="tagline" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} />
        </div>
        <div>
          <Label htmlFor="description">Descrição completa</Label>
          <Textarea id="description" value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Cidade</Label>
            <Select value={form.city_id} onValueChange={(v) => set("city_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {(cities.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">E-mail de contato</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Link to="/painel/empresas"><Button type="button" variant="ghost">Cancelar</Button></Link>
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar empresa"}</Button>
        </div>
      </form>
    </div>
  );
}

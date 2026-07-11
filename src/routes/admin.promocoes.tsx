import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  adminListCoupons,
  adminListPromotions,
  deleteCoupon,
  deletePromotion,
  slugify,
  upsertCoupon,
  upsertPromotion,
  type Coupon,
  type Promotion,
} from "@/lib/promocoes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, BadgePercent, Ticket } from "lucide-react";

export const Route = createFileRoute("/admin/promocoes")({
  head: () => ({ meta: [{ title: "Promoções e Cupons — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminPromocoesPage,
});

type CompanyOpt = { id: string; name: string; plan: string | null };
type CityOpt = { id: string; name: string };

function AdminPromocoesPage() {
  const qc = useQueryClient();
  const promos = useQuery({ queryKey: ["admin", "promotions"], queryFn: adminListPromotions });
  const coupons = useQuery({ queryKey: ["admin", "coupons"], queryFn: adminListCoupons });
  const companies = useQuery({
    queryKey: ["admin", "companies-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name, plan").order("name").limit(500);
      if (error) throw error;
      return (data ?? []) as CompanyOpt[];
    },
  });
  const cities = useQuery({
    queryKey: ["cities-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as CityOpt[];
    },
  });

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Promoções e Cupons</h1>
          <p className="text-sm text-muted-foreground">Gerencie promoções das empresas parceiras e cupons patrocinados.</p>
        </div>
      </header>

      <Tabs defaultValue="promotions">
        <TabsList>
          <TabsTrigger value="promotions">
            <BadgePercent className="mr-2 h-4 w-4" /> Promoções ({promos.data?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="coupons">
            <Ticket className="mr-2 h-4 w-4" /> Cupons ({coupons.data?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promotions" className="mt-4">
          <div className="mb-3 flex justify-end">
            <PromotionDialog
              companies={companies.data ?? []}
              cities={cities.data ?? []}
              onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "promotions"] })}
            />
          </div>
          <PromotionsTable
            rows={promos.data ?? []}
            loading={promos.isLoading}
            companies={companies.data ?? []}
            cities={cities.data ?? []}
            onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "promotions"] })}
          />
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          <div className="mb-3 flex justify-end">
            <CouponDialog
              companies={companies.data ?? []}
              cities={cities.data ?? []}
              onSaved={() => qc.invalidateQueries({ queryKey: ["admin", "coupons"] })}
            />
          </div>
          <CouponsTable
            rows={coupons.data ?? []}
            loading={coupons.isLoading}
            companies={companies.data ?? []}
            cities={cities.data ?? []}
            onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "coupons"] })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PromotionsTable({
  rows,
  loading,
  companies,
  cities,
  onChanged,
}: {
  rows: Promotion[];
  loading: boolean;
  companies: CompanyOpt[];
  cities: CityOpt[];
  onChanged: () => void;
}) {
  async function del(id: string) {
    if (!confirm("Excluir esta promoção?")) return;
    try {
      await deletePromotion(id);
      toast.success("Promoção excluída");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Carregando…</div>;
  if (rows.length === 0) return <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Nenhuma promoção cadastrada.</div>;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Título</th>
            <th className="px-3 py-2">Empresa</th>
            <th className="px-3 py-2">Cidade</th>
            <th className="px-3 py-2">Desconto</th>
            <th className="px-3 py-2">Válido até</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="px-3 py-2 font-medium">{p.title}</td>
              <td className="px-3 py-2">
                {p.companies?.name}{" "}
                {p.companies?.plan && <Badge variant="secondary" className="ml-1">{p.companies.plan}</Badge>}
              </td>
              <td className="px-3 py-2">{p.cities?.name || "—"}</td>
              <td className="px-3 py-2">{p.discount_percent ? `${p.discount_percent}%` : "—"}</td>
              <td className="px-3 py-2">{p.valid_to ? new Date(p.valid_to).toLocaleDateString("pt-BR") : "—"}</td>
              <td className="px-3 py-2">
                <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-1">
                  <PromotionDialog
                    companies={companies}
                    cities={cities}
                    existing={p}
                    onSaved={onChanged}
                    trigger={
                      <Button size="sm" variant="ghost">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button size="sm" variant="ghost" onClick={() => del(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CouponsTable({
  rows,
  loading,
  companies,
  cities,
  onChanged,
}: {
  rows: Coupon[];
  loading: boolean;
  companies: CompanyOpt[];
  cities: CityOpt[];
  onChanged: () => void;
}) {
  async function del(id: string) {
    if (!confirm("Excluir este cupom?")) return;
    try {
      await deleteCoupon(id);
      toast.success("Cupom excluído");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (loading) return <div className="py-10 text-center text-muted-foreground">Carregando…</div>;
  if (rows.length === 0) return <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Nenhum cupom cadastrado.</div>;

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Título</th>
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">Loja</th>
            <th className="px-3 py-2">Cidade</th>
            <th className="px-3 py-2">Desconto</th>
            <th className="px-3 py-2">Patrocinado</th>
            <th className="px-3 py-2">Válido até</th>
            <th className="px-3 py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-3 py-2 font-medium">{c.title}</td>
              <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
              <td className="px-3 py-2">{c.companies?.name || "—"}</td>
              <td className="px-3 py-2">{c.cities?.name || "—"}</td>
              <td className="px-3 py-2">
                {c.discount_label || (c.discount_percent ? `${c.discount_percent}%` : "—")}
              </td>
              <td className="px-3 py-2">{c.is_sponsored ? <Badge className="bg-accent text-accent-foreground">Sim</Badge> : "—"}</td>
              <td className="px-3 py-2">{c.valid_to ? new Date(c.valid_to).toLocaleDateString("pt-BR") : "—"}</td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex gap-1">
                  <CouponDialog
                    companies={companies}
                    cities={cities}
                    existing={c}
                    onSaved={onChanged}
                    trigger={
                      <Button size="sm" variant="ghost">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button size="sm" variant="ghost" onClick={() => del(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PromotionDialog({
  companies,
  cities,
  existing,
  onSaved,
  trigger,
}: {
  companies: CompanyOpt[];
  cities: CityOpt[];
  existing?: Promotion;
  onSaved: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [cityId, setCityId] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [discount, setDiscount] = useState<string>("");
  const [validTo, setValidTo] = useState("");
  const [status, setStatus] = useState("published");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setDescription(existing.description ?? "");
      setCompanyId(existing.company_id);
      setCityId(existing.city_id ?? "");
      setCategory(existing.category ?? "");
      setImageUrl(existing.image_url ?? existing.cover_image ?? "");
      setLinkUrl(existing.link_url ?? "");
      setDiscount(existing.discount_percent?.toString() ?? "");
      setValidTo(existing.valid_to ? existing.valid_to.slice(0, 10) : "");
      setStatus(existing.status);
    } else {
      setTitle(""); setSlug(""); setDescription(""); setCompanyId(""); setCityId("");
      setCategory(""); setImageUrl(""); setLinkUrl(""); setDiscount(""); setValidTo("");
      setStatus("published");
    }
  }, [open, existing]);

  async function save() {
    if (!title.trim() || !companyId) {
      toast.error("Título e empresa são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await upsertPromotion({
        id: existing?.id,
        title: title.trim(),
        slug: (slug || slugify(title)) || slugify(title),
        description: description.trim() || null,
        company_id: companyId,
        city_id: cityId || null,
        category: category.trim() || null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        discount_percent: discount ? Number(discount) : null,
        valid_to: validTo ? new Date(validTo).toISOString() : null,
        status,
      });
      toast.success(existing ? "Promoção atualizada" : "Promoção criada");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nova promoção
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar promoção" : "Nova promoção"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!existing) setSlug(slugify(e.target.value)); }} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Empresa *</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.plan ? `(${c.plan})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Cidade</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="">Todas</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Estética, Gastronomia" />
          </div>
          <div>
            <Label>Desconto (%)</Label>
            <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Imagem (URL)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <Label>Link externo</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <Label>Válido até</Label>
            <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CouponDialog({
  companies,
  cities,
  existing,
  onSaved,
  trigger,
}: {
  companies: CompanyOpt[];
  cities: CityOpt[];
  existing?: Coupon;
  onSaved: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [cityId, setCityId] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [discountPct, setDiscountPct] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [terms, setTerms] = useState("");
  const [validTo, setValidTo] = useState("");
  const [sponsored, setSponsored] = useState(false);
  const [status, setStatus] = useState("published");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title);
      setCode(existing.code);
      setDescription(existing.description ?? "");
      setCompanyId(existing.company_id ?? "");
      setCityId(existing.city_id ?? "");
      setCategory(existing.category ?? "");
      setImageUrl(existing.image_url ?? "");
      setLinkUrl(existing.link_url ?? "");
      setDiscountPct(existing.discount_percent?.toString() ?? "");
      setDiscountLabel(existing.discount_label ?? "");
      setTerms(existing.terms ?? "");
      setValidTo(existing.valid_to ? existing.valid_to.slice(0, 10) : "");
      setSponsored(existing.is_sponsored);
      setStatus(existing.status);
    } else {
      setTitle(""); setCode(""); setDescription(""); setCompanyId(""); setCityId("");
      setCategory(""); setImageUrl(""); setLinkUrl(""); setDiscountPct(""); setDiscountLabel("");
      setTerms(""); setValidTo(""); setSponsored(false); setStatus("published");
    }
  }, [open, existing]);

  async function save() {
    if (!title.trim() || !code.trim()) {
      toast.error("Título e código são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      await upsertCoupon({
        id: existing?.id,
        title: title.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || null,
        company_id: companyId || null,
        city_id: cityId || null,
        category: category.trim() || null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        discount_percent: discountPct ? Number(discountPct) : null,
        discount_label: discountLabel.trim() || null,
        terms: terms.trim() || null,
        valid_to: validTo ? new Date(validTo).toISOString() : null,
        is_sponsored: sponsored,
        status,
      });
      toast.success(existing ? "Cupom atualizado" : "Cupom criado");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Novo cupom
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar cupom" : "Novo cupom"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Código *</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AGENDA10" className="font-mono" />
          </div>
          <div>
            <Label>Loja associada</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Nenhuma</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Cidade</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="">Todas</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div>
            <Label>Desconto (%)</Label>
            <Input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} />
          </div>
          <div>
            <Label>Rótulo do desconto</Label>
            <Input value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} placeholder="Ex: Frete grátis, 2 por 1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Imagem (URL)</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Link externo</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Termos e condições</Label>
            <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Válido até</Label>
            <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="published">Publicado</option>
              <option value="draft">Rascunho</option>
              <option value="archived">Arquivado</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
            <div>
              <div className="text-sm font-semibold">Cupom patrocinado</div>
              <div className="text-xs text-muted-foreground">Destaca o cupom com selo especial.</div>
            </div>
            <Switch checked={sponsored} onCheckedChange={setSponsored} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

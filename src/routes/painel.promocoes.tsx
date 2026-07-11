import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useAdmin } from "@/hooks/use-admin";
import {
  deletePromotion,
  listMyEligibleCompanies,
  listMyPromotions,
  slugify,
  upsertPromotion,
  type Promotion,
} from "@/lib/promocoes";
import { uploadPromotionImage } from "@/lib/promotion-upload";
import { notifyNewPromotion } from "@/lib/promocoes-notify.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BadgePercent, Crown, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { isPremium } from "@/lib/plans";

export const Route = createFileRoute("/painel/promocoes")({
  head: () => ({ meta: [{ title: "Minhas promoções — AgenddaAqui" }, { name: "robots", content: "noindex" }] }),
  component: PanelPromocoesPage,
});

type Company = { id: string; name: string; plan: string | null; city_id: string | null };
type CityOpt = { id: string; name: string };

function PanelPromocoesPage() {
  const { userId } = useAdmin();
  const qc = useQueryClient();

  const companies = useQuery({
    queryKey: ["my-eligible-companies", userId],
    queryFn: () => listMyEligibleCompanies(userId!),
    enabled: !!userId,
  });
  const cities = useQuery({
    queryKey: ["cities-lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cities").select("id, name").order("name");
      if (error) throw error;
      return (data ?? []) as CityOpt[];
    },
  });
  const promos = useQuery({
    queryKey: ["my-promotions", userId],
    queryFn: () => listMyPromotions(userId!),
    enabled: !!userId,
  });

  if (!userId) return null;

  const eligibleCompanies = (companies.data ?? []) as Company[];
  const hasEligible = eligibleCompanies.length > 0;
  const myPromos = promos.data ?? [];

  // Premium (1 limit) → block if company already has a promo.
  const companiesAtLimit = new Set(
    eligibleCompanies
      .filter((c) => c.plan === "premium" && myPromos.some((p) => p.company_id === c.id))
      .map((c) => c.id)
  );
  const canCreate = hasEligible && eligibleCompanies.some((c) => c.plan === "featured" || !companiesAtLimit.has(c.id));

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Minhas promoções</h1>
          <p className="text-sm text-muted-foreground">Publique ofertas que aparecem na página <Link to="/promocoes" className="text-primary underline">Promoções perto de você</Link>.</p>
        </div>
        {canCreate && (
          <PromotionDialog
            companies={eligibleCompanies.filter((c) => c.plan === "featured" || !companiesAtLimit.has(c.id))}
            cities={cities.data ?? []}
            onSaved={() => qc.invalidateQueries({ queryKey: ["my-promotions"] })}
          />
        )}
      </header>

      {!hasEligible && (
        <div className="mb-6 rounded-lg border border-accent/40 bg-accent/5 p-6 text-center">
          <Crown className="mx-auto mb-2 h-8 w-8 text-accent" />
          <h2 className="font-display text-lg font-bold">Recurso exclusivo para Premium e Destaque</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Empresas <b>Premium</b> podem cadastrar 1 promoção. Empresas <b>Destaque</b> não têm limite.
          </p>
          <Link to="/planos">
            <Button className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">Ver planos</Button>
          </Link>
        </div>
      )}

      {hasEligible && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {eligibleCompanies.map((c) => {
            const count = myPromos.filter((p) => p.company_id === c.id).length;
            const isPrem = c.plan === "premium";
            const limitReached = isPrem && count >= 1;
            return (
              <div key={c.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{c.name}</div>
                  <Badge variant="secondary">{c.plan}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {count} promoção{count === 1 ? "" : "s"}
                  {isPrem && ` · limite ${count}/1`}
                  {limitReached && " · ✅ limite atingido"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {promos.isLoading && <div className="py-10 text-center text-muted-foreground">Carregando…</div>}
        {!promos.isLoading && myPromos.length === 0 && hasEligible && (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            Nenhuma promoção cadastrada ainda.
          </div>
        )}
        {myPromos.map((p) => (
          <MyPromoRow
            key={p.id}
            p={p}
            companies={eligibleCompanies}
            cities={cities.data ?? []}
            onChanged={() => qc.invalidateQueries({ queryKey: ["my-promotions"] })}
          />
        ))}
      </div>
    </div>
  );
}

function MyPromoRow({
  p,
  companies,
  cities,
  onChanged,
}: {
  p: Promotion;
  companies: Company[];
  cities: CityOpt[];
  onChanged: () => void;
}) {
  async function del() {
    if (!confirm("Excluir esta promoção?")) return;
    try {
      await deletePromotion(p.id);
      toast.success("Promoção excluída");
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  const premium = isPremium(p.companies?.plan);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
          <BadgePercent className="h-6 w-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{p.title}</span>
            <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
            {premium && <Badge className="bg-accent/80 text-accent-foreground">Premium</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">
            {p.companies?.name} · {p.discount_percent ? `-${p.discount_percent}%` : "sem desconto"} ·{" "}
            {p.valid_to ? `até ${new Date(p.valid_to).toLocaleDateString("pt-BR")}` : "sem prazo"}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <PromotionDialog
          companies={companies}
          cities={cities}
          existing={p}
          onSaved={onChanged}
          trigger={
            <Button variant="outline" size="sm">
              <Pencil className="mr-1 h-3 w-3" /> Editar
            </Button>
          }
        />
        <Button variant="ghost" size="sm" onClick={del}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
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
  companies: Company[];
  cities: CityOpt[];
  existing?: Promotion;
  onSaved: () => void;
  trigger?: React.ReactNode;
}) {
  const { userId } = useAdmin();
  const notifyFn = useServerFn(notifyNewPromotion);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [cityId, setCityId] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [discount, setDiscount] = useState("");
  const [validTo, setValidTo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setCompanyId(existing.company_id);
      setCityId(existing.city_id ?? "");
      setCategory(existing.category ?? "");
      setImageUrl(existing.image_url ?? existing.cover_image ?? "");
      setLinkUrl(existing.link_url ?? "");
      setDiscount(existing.discount_percent?.toString() ?? "");
      setValidTo(existing.valid_to ? existing.valid_to.slice(0, 10) : "");
    } else {
      setTitle(""); setDescription(""); setCompanyId(companies[0]?.id ?? ""); setCityId(companies[0]?.city_id ?? "");
      setCategory(""); setImageUrl(""); setLinkUrl(""); setDiscount(""); setValidTo("");
    }
  }, [open, existing, companies]);

  async function handleFile(f: File | null) {
    if (!f || !userId) return;
    setUploading(true);
    try {
      const url = await uploadPromotionImage(f, userId);
      setImageUrl(url);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!title.trim() || !companyId) {
      toast.error("Preencha título e empresa");
      return;
    }
    setSaving(true);
    try {
      const isNew = !existing?.id;
      const savedId = await upsertPromotion({
        id: existing?.id,
        title: title.trim(),
        slug: slugify(title) || `promo-${Date.now()}`,
        description: description.trim() || null,
        company_id: companyId,
        city_id: cityId || null,
        category: category.trim() || null,
        image_url: imageUrl.trim() || null,
        link_url: linkUrl.trim() || null,
        discount_percent: discount ? Number(discount) : null,
        valid_to: validTo ? new Date(validTo).toISOString() : null,
        status: "published",
      });
      toast.success(existing ? "Promoção atualizada" : "Promoção publicada");
      setOpen(false);
      onSaved();

      // Dispara push apenas em novas publicações — falha silenciosa (não bloqueia UX).
      if (isNew && savedId) {
        notifyFn({ data: { promotionId: savedId } })
          .then((r) => {
            if (r?.ok) toast.message("🔔 Push enviado para usuários da cidade");
          })
          .catch(() => {/* noop */});
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("Premium podem cadastrar")) {
        toast.error("Você já possui 1 promoção ativa. Faça upgrade para o plano Destaque para adicionar mais.");
      } else {
        toast.error(msg);
      }
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
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: 30% OFF em higienização" />
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
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.plan})</option>
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
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Estética" />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Salvando…" : "Publicar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

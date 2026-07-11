import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { getMyCompany, updateMyCompany, deleteMyCompany, listCities, type CompanyPatch } from "@/lib/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DIFFERENTIAL_OPTIONS } from "@/components/site/CompanyProfileSections";
import { ChevronLeft, Trash2, ExternalLink, Crown } from "lucide-react";
import { ProfileCompleteness } from "@/components/panel/ProfileCompleteness";
import { PremiumLock } from "@/components/panel/PremiumLock";
import { HoursEditor, type HoursValue } from "@/components/panel/HoursEditor";
import { CompanyImageUpload } from "@/components/panel/CompanyImageUpload";

import { isPremium } from "@/lib/plans";



const CERT_FIELDS: { key: string; label: string }[] = [
  { key: "cnpj", label: "CNPJ validado" },
  { key: "cpf_responsavel", label: "CPF do responsável" },
  { key: "google_maps", label: "Google Maps" },
  { key: "crea", label: "CREA" },
  { key: "cau", label: "CAU" },
  { key: "nota_fiscal", label: "Emite nota fiscal" },
  { key: "garantia", label: "Oferece garantia" },
];

const BADGE_OPTIONS: { key: string; label: string }[] = [
  { key: "mais_contratado", label: "Mais contratado" },
  { key: "top_atendimento", label: "Top atendimento" },
  { key: "entrega_garantida", label: "Entrega garantida" },
  { key: "especialista", label: "Especialista" },
  { key: "parceiro", label: "Parceiro AgendaAqui" },
  { key: "top_10", label: "Top 10 da cidade" },
];

const QUALITY_FIELDS: { key: string; label: string }[] = [
  { key: "quality", label: "Qualidade" },
  { key: "punctuality", label: "Pontualidade" },
  { key: "service", label: "Atendimento" },
  { key: "cleanliness", label: "Limpeza" },
  { key: "value", label: "Custo-benefício" },
];

export const Route = createFileRoute("/painel/empresas/$id")({
  component: EditarEmpresa,
});

function EditarEmpresa() {
  const { id } = Route.useParams();
  const { userId, loading } = useAdmin();
  const nav = useNavigate();
  const qc = useQueryClient();
  const cities = useQuery({ queryKey: ["cities"], queryFn: listCities });
  const company = useQuery({
    queryKey: ["panel-company", id, userId],
    queryFn: () => getMyCompany(userId!, id),
    enabled: !!userId && !!id,
  });

  const [form, setForm] = useState<CompanyPatch>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company.data) {
      const c = company.data as Record<string, unknown>;
      setForm({
        name: c.name as string, tagline: (c.tagline as string) ?? "", description: (c.description as string) ?? "",
        phone: (c.phone as string) ?? "", whatsapp: (c.whatsapp as string) ?? "", email: (c.email as string) ?? "",
        address: (c.address as string) ?? "", zip: (c.zip as string) ?? "", city_id: (c.city_id as string) ?? "",
        website: (c.website as string) ?? "", instagram: (c.instagram as string) ?? "", facebook: (c.facebook as string) ?? "",
        tiktok: (c.tiktok as string) ?? "", youtube: (c.youtube as string) ?? "",
        logo_url: (c.logo_url as string) ?? "", banner_url: (c.banner_url as string) ?? "", video_url: (c.video_url as string) ?? "",
        status: (c.status as string) ?? "pending",
        founded_year: (c.founded_year as number) ?? null,
        response_time_minutes: (c.response_time_minutes as number) ?? null,
        response_rate: (c.response_rate as number) ?? null,
        services_completed: (c.services_completed as number) ?? null,
        clients_served: (c.clients_served as number) ?? null,
        price_range: (c.price_range as number) ?? null,
        tour_360_url: (c.tour_360_url as string) ?? "",
        catalog_url: (c.catalog_url as string) ?? "",
        pricebook_url: (c.pricebook_url as string) ?? "",
        portfolio_pdf_url: (c.portfolio_pdf_url as string) ?? "",
        coverage_cities: (c.coverage_cities as string[]) ?? [],
        differentials: (c.differentials as string[]) ?? [],
        badges: (c.badges as string[]) ?? [],
        certifications: (c.certifications as Record<string, boolean>) ?? {},
        quality_scores: (c.quality_scores as Record<string, number>) ?? {},
        promotions: (c.promotions as unknown[]) ?? [],
        financing_info: (c.financing_info as Record<string, unknown>) ?? {},
      });
    }
  }, [company.data]);

  if (loading || company.isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (!company.data) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Empresa não encontrada ou você não tem acesso.</p>
        <Link to="/painel/empresas"><Button variant="ghost" className="mt-3">Voltar</Button></Link>
      </div>
    );
  }

  function set<K extends keyof CompanyPatch>(k: K, v: CompanyPatch[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const plan = (company.data as { plan?: string } | undefined)?.plan;
    if (!isPremium(plan)) {
      const socials = (["instagram", "facebook", "tiktok", "youtube"] as const).filter(
        (k) => ((form[k] as string | undefined) ?? "").trim().length > 0,
      );
      if (socials.length > 1) {
        toast.error("Plano Grátis permite vincular apenas 1 rede social. Faça upgrade para o Premium para adicionar todas.");
        return;
      }
    }
    setSaving(true);
    try {
      await updateMyCompany(id, form);
      toast.success("Alterações salvas");
      qc.invalidateQueries({ queryKey: ["panel-company", id] });
      qc.invalidateQueries({ queryKey: ["panel-companies"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Excluir esta empresa permanentemente?")) return;
    try {
      await deleteMyCompany(id);
      toast.success("Empresa excluída");
      qc.invalidateQueries({ queryKey: ["panel-companies"] });
      nav({ to: "/painel/empresas" });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const slugStr = (company.data as { slug: string }).slug;

  function toggleArray<K extends "differentials" | "badges" | "coverage_cities">(k: K, v: string) {
    setForm((f) => {
      const cur = (f[k] as string[] | undefined) ?? [];
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      return { ...f, [k]: next };
    });
  }

  function setCert(key: string, value: boolean) {
    setForm((f) => ({
      ...f,
      certifications: { ...(f.certifications as Record<string, boolean> | undefined ?? {}), [key]: value },
    }));
  }

  function setQuality(key: string, value: number) {
    setForm((f) => ({
      ...f,
      quality_scores: { ...(f.quality_scores as Record<string, number> | undefined ?? {}), [key]: value },
    }));
  }

  const certs = (form.certifications as Record<string, boolean> | undefined) ?? {};
  const qscores = (form.quality_scores as Record<string, number> | undefined) ?? {};
  const promoObj = (Array.isArray(form.promotions) && form.promotions[0]) as { title?: string; description?: string } | undefined;
  const finObj = (form.financing_info as { installments?: number; label?: string } | undefined) ?? {};

  return (
    <div className="max-w-4xl">
      <Link to="/painel/empresas" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Voltar</Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {form.name || "Empresa"}
            {isPremium((company.data as { plan?: string } | undefined)?.plan) ? (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 align-middle text-[11px] font-semibold text-accent-foreground">
                <Crown className="h-3 w-3" /> Premium
              </span>
            ) : (
              <Link to="/planos" className="ml-2 inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 align-middle text-[11px] font-semibold text-accent hover:bg-accent/20">
                <Crown className="h-3 w-3" /> Plano Grátis · Fazer upgrade
              </Link>
            )}
          </h1>
          <p className="text-xs text-muted-foreground">/empresa/{slugStr}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/empresa/$slug" params={{ slug: slugStr }} target="_blank"><Button variant="outline" size="sm" className="gap-1"><ExternalLink className="h-4 w-4" /> Ver</Button></Link>
          <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={remove}><Trash2 className="h-4 w-4" /> Excluir</Button>
        </div>
      </div>


      <form onSubmit={save} className="mt-6">
        <div className="mb-6">
          <ProfileCompleteness company={company.data as Record<string, unknown>} companyId={id} />
        </div>

        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="midia">Mídia</TabsTrigger>
            <TabsTrigger value="horarios">Horários</TabsTrigger>
            <TabsTrigger value="reputacao">Reputação</TabsTrigger>
            <TabsTrigger value="cobertura">Cobertura</TabsTrigger>
            <TabsTrigger value="cert">Certificações</TabsTrigger>
            <TabsTrigger value="promo">Promoções</TabsTrigger>
          </TabsList>


          {/* -------- Perfil -------- */}
          <TabsContent value="perfil" className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome *</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} required /></div>
              <div className="sm:col-span-2"><Label>Slogan</Label><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Descrição</Label><Textarea rows={5} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status ?? "pending"} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cidade principal</Label>
                <Select value={form.city_id ?? ""} onValueChange={(v) => set("city_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>
                    {(cities.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Endereço</Label><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
              <div><Label>CEP</Label><Input value={form.zip ?? ""} onChange={(e) => set("zip", e.target.value)} /></div>
              <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
              <div><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
              <div><Label>Website</Label><Input value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></div>
              {(() => {
                const plan = (company.data as { plan?: string } | undefined)?.plan;
                const premium = isPremium(plan);
                const SOCIALS = ["instagram", "facebook", "tiktok", "youtube"] as const;
                const filled = SOCIALS.filter((k) => ((form[k] as string | undefined) ?? "").trim().length > 0);
                const lockOthers = !premium && filled.length >= 1;
                const socialField = (k: typeof SOCIALS[number], label: string, placeholder?: string) => {
                  const value = (form[k] as string | undefined) ?? "";
                  const disabled = lockOthers && !filled.includes(k);
                  return (
                    <div>
                      <Label className="flex items-center justify-between">
                        <span>{label}</span>
                        {disabled && <span className="text-[10px] font-normal text-muted-foreground">Premium para adicionar mais</span>}
                      </Label>
                      <Input
                        value={value}
                        onChange={(e) => set(k, e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                      />
                    </div>
                  );
                };
                return (
                  <>
                    {socialField("instagram", "Instagram", "@usuario")}
                    {socialField("facebook", "Facebook")}
                    {socialField("tiktok", "TikTok", "@usuario")}
                    {socialField("youtube", "YouTube", "@canal ou URL")}
                    {!premium && (
                      <div className="sm:col-span-2 -mt-1 text-[11px] text-muted-foreground">
                        Plano Grátis vincula 1 rede social. <Link to="/planos" className="font-semibold text-accent hover:underline">Assine o Premium</Link> para liberar todas.
                      </div>
                    )}
                  </>
                );
              })()}
              <div><Label>Ano de fundação</Label><Input type="number" value={form.founded_year ?? ""} onChange={(e) => set("founded_year", e.target.value ? Number(e.target.value) : null)} placeholder="2012" /></div>
              <div>
                <Label>Faixa de preço</Label>
                <Select value={form.price_range ? String(form.price_range) : ""} onValueChange={(v) => set("price_range", v ? Number(v) : null)}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">$ — econômico</SelectItem>
                    <SelectItem value="2">$$ — intermediário</SelectItem>
                    <SelectItem value="3">$$$ — premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* -------- Mídia -------- */}
          <TabsContent value="midia" className="mt-4 rounded-xl border border-border bg-card p-5">
            {(() => { const plan = (company.data as { plan?: string } | undefined)?.plan; return (
            <div className="grid gap-6 sm:grid-cols-2">
              <CompanyImageUpload
                companyId={id}
                kind="logo"
                value={form.logo_url ?? null}
                onChange={(u) => set("logo_url", u)}
              />
              <div>
                <PremiumLock plan={plan} label="Banner de capa é Premium">
                  <CompanyImageUpload
                    companyId={id}
                    kind="banner"
                    value={form.banner_url ?? null}
                    onChange={(u) => set("banner_url", u)}
                    disabled={!isPremium(plan)}
                  />
                </PremiumLock>
              </div>
              <div className="sm:col-span-2">
                <Label>Vídeo (YouTube)</Label>
                <PremiumLock plan={plan} label="Vídeo é Premium">
                  <Input value={form.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} placeholder="https://youtube.com/…" disabled={!isPremium(plan)} />
                </PremiumLock>
              </div>
              <div className="sm:col-span-2">
                <Label>Tour 360° (embed URL)</Label>
                <PremiumLock plan={plan} label="Tour 360° é Premium">
                  <Input value={form.tour_360_url ?? ""} onChange={(e) => set("tour_360_url", e.target.value)} placeholder="https://…" disabled={!isPremium(plan)} />
                </PremiumLock>
              </div>
              <div>
                <Label>Catálogo (URL)</Label>
                <PremiumLock plan={plan} label="Catálogo é Premium">
                  <Input value={form.catalog_url ?? ""} onChange={(e) => set("catalog_url", e.target.value)} placeholder="https://…pdf" disabled={!isPremium(plan)} />
                </PremiumLock>
              </div>
              <div>
                <Label>Tabela de preços (URL)</Label>
                <PremiumLock plan={plan} label="Tabela de preços é Premium">
                  <Input value={form.pricebook_url ?? ""} onChange={(e) => set("pricebook_url", e.target.value)} placeholder="https://…pdf" disabled={!isPremium(plan)} />
                </PremiumLock>
              </div>
              <div className="sm:col-span-2">
                <Label>Portfólio em PDF (URL)</Label>
                <PremiumLock plan={plan} label="Portfólio PDF é Premium">
                  <Input value={form.portfolio_pdf_url ?? ""} onChange={(e) => set("portfolio_pdf_url", e.target.value)} placeholder="https://…pdf" disabled={!isPremium(plan)} />
                </PremiumLock>
              </div>
            </div>
            ); })()}
            <p className="mt-4 text-xs text-muted-foreground">
              {isPremium((company.data as { plan?: string } | undefined)?.plan)
                ? "A galeria de fotos é gerenciada em breve pela aba Mídia dedicada."
                : "No plano Grátis você tem Logo e até 3 fotos. Faça upgrade para desbloquear banner, vídeo, tour 360° e materiais em PDF."}
            </p>
          </TabsContent>

          {/* -------- Horários de funcionamento (Premium) -------- */}
          <TabsContent value="horarios" className="mt-4 rounded-xl border border-border bg-card p-5">
            {(() => {
              const plan = (company.data as { plan?: string } | undefined)?.plan;
              if (!isPremium(plan)) {
                return (
                  <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-6 text-center">
                    <Crown className="mx-auto h-8 w-8 text-accent" />
                    <h3 className="mt-2 font-semibold">Horários de funcionamento é um recurso Premium</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Mostre quando sua empresa está aberta. Clientes veem "Aberto agora" em tempo real no seu perfil.</p>
                    <Link to="/planos" className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground hover:bg-accent/90">
                      <Crown className="h-4 w-4" /> Fazer upgrade
                    </Link>
                  </div>
                );
              }
              return (
                <>
                  <div className="mb-3">
                    <h3 className="font-semibold">Horários de funcionamento</h3>
                    <p className="text-xs text-muted-foreground">Defina os dias e horários. Os clientes veem status "Aberto agora" ou "Fechado" em tempo real.</p>
                  </div>
                  <HoursEditor value={(form.hours as HoursValue) ?? null} onChange={(v: HoursValue) => set("hours", v)} />
                </>
              );
            })()}
          </TabsContent>




          {/* -------- Reputação e atendimento -------- */}
          <TabsContent value="reputacao" className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Tempo de resposta (minutos)</Label><Input type="number" value={form.response_time_minutes ?? ""} onChange={(e) => set("response_time_minutes", e.target.value ? Number(e.target.value) : null)} placeholder="5" /></div>
              <div><Label>Taxa de resposta (%)</Label><Input type="number" step="0.1" min="0" max="100" value={form.response_rate ?? ""} onChange={(e) => set("response_rate", e.target.value ? Number(e.target.value) : null)} placeholder="99" /></div>
              <div><Label>Serviços realizados (total)</Label><Input type="number" value={form.services_completed ?? ""} onChange={(e) => set("services_completed", e.target.value ? Number(e.target.value) : null)} placeholder="320" /></div>
              <div><Label>Clientes atendidos (total)</Label><Input type="number" value={form.clients_served ?? ""} onChange={(e) => set("clients_served", e.target.value ? Number(e.target.value) : null)} placeholder="180" /></div>
            </div>

            <div className="mt-6">
              <Label className="mb-2 block">Indicadores de qualidade (0 a 5)</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {QUALITY_FIELDS.map((f) => (
                  <div key={f.key}>
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input type="number" step="0.1" min="0" max="5" value={qscores[f.key] ?? ""} onChange={(e) => setQuality(f.key, Number(e.target.value))} placeholder="4.8" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <Label className="mb-2 block">Diferenciais (ícones no perfil)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {DIFFERENTIAL_OPTIONS.map((opt) => {
                  const checked = (form.differentials ?? []).includes(opt.value);
                  return (
                    <label key={opt.value} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={checked} onCheckedChange={() => toggleArray("differentials", opt.value)} />
                      {opt.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* -------- Cobertura -------- */}
          <TabsContent value="cobertura" className="mt-4 rounded-xl border border-border bg-card p-5">
            <Label className="mb-2 block">Cidades atendidas (além da sede)</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(cities.data ?? []).map((c) => {
                const checked = (form.coverage_cities ?? []).includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={checked} onCheckedChange={() => toggleArray("coverage_cities", c.id)} />
                    {c.name} — {c.state}
                  </label>
                );
              })}
            </div>
          </TabsContent>

          {/* -------- Certificações e selos -------- */}
          <TabsContent value="cert" className="mt-4 rounded-xl border border-border bg-card p-5">
            <Accordion type="multiple" defaultValue={["c", "b"]}>
              <AccordionItem value="c">
                <AccordionTrigger>Certificações</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {CERT_FIELDS.map((f) => (
                      <label key={f.key} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm cursor-pointer hover:bg-muted/40">
                        <Checkbox checked={!!certs[f.key]} onCheckedChange={(v) => setCert(f.key, !!v)} />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="b">
                <AccordionTrigger>Selos e reconhecimentos</AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {BADGE_OPTIONS.map((opt) => {
                      const checked = (form.badges ?? []).includes(opt.key);
                      return (
                        <label key={opt.key} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm cursor-pointer hover:bg-muted/40">
                          <Checkbox checked={checked} onCheckedChange={() => toggleArray("badges", opt.key)} />
                          {opt.label}
                        </label>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* -------- Promoções e financiamento -------- */}
          <TabsContent value="promo" className="mt-4 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-4">
              <div><Label>Título da promoção</Label><Input value={promoObj?.title ?? ""} onChange={(e) => set("promotions", [{ ...(promoObj ?? {}), title: e.target.value }])} placeholder="15% em projetos fechados este mês" /></div>
              <div><Label>Descrição</Label><Textarea rows={3} value={promoObj?.description ?? ""} onChange={(e) => set("promotions", [{ ...(promoObj ?? {}), description: e.target.value }])} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label>Parcelamento em até (x)</Label><Input type="number" value={finObj.installments ?? ""} onChange={(e) => set("financing_info", { ...finObj, installments: e.target.value ? Number(e.target.value) : undefined })} placeholder="12" /></div>
                <div><Label>Rótulo</Label><Input value={finObj.label ?? ""} onChange={(e) => set("financing_info", { ...finObj, label: e.target.value })} placeholder="sem juros" /></div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar alterações"}</Button>
        </div>
      </form>
    </div>
  );
}

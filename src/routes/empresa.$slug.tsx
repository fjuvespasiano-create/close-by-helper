import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone, MessageCircle, Share2, MapPin, Globe, Instagram, Facebook, Star, BadgeCheck,
  Clock, CheckCircle2, Copy, Navigation, Mail, CalendarDays, ShieldCheck, Award,
  CreditCard, Banknote, Users, TrendingUp, Sparkles, ThumbsUp, Building2, Languages,
  Wallet, QrCode, ExternalLink, ChevronRight, Download, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewsSection } from "@/components/site/ReviewsSection";
import { QuoteDialog } from "@/components/site/QuoteDialog";
import { CompanyCard, toCompanyCardData } from "@/components/site/CompanyCard";
import { companyBySlugQueryOptions, fetchCompanyReviews, fetchSimilarCompanies, fetchCitiesByIds } from "@/lib/queries";
import { FavoriteButton } from "@/components/site/FavoriteButton";
import { telUrl, waUrl } from "@/lib/format";
import {
  QualityBars, CertificationsGrid, DifferentialsGrid, CoverageArea, SocialLinksExtra,
  ResponseStatsRow, PromotionBanner, StatusPills,
  type QualityScores, type Certifications,
} from "@/components/site/CompanyProfileSections";
import {
  ReputationRing, SatisfactionStats, CompanyTimeline, TrustSeals, SocialProofBar,
} from "@/components/site/CompanyReputationSections";

export const Route = createFileRoute("/empresa/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — AgendaAqui` },
      { name: "description", content: `Veja avaliações, fotos, horários e contato de ${params.slug} no AgendaAqui.` },
      { property: "og:url", content: `/empresa/${params.slug}` },
      { property: "og:type", content: "profile" },
    ],
    links: [{ rel: "canonical", href: `/empresa/${params.slug}` }],
  }),
  component: CompanyPage,
  // Prefetch on hover / SSR so page paint is instant.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(companyBySlugQueryOptions(params.slug));
  },
});

type Media = { id: string; url: string; type: string; sort: number };
type CatLink = { categories: { id?: string; name: string; slug: string; icon: string | null } | null };
type Company = {
  id: string; slug: string; name: string; tagline: string | null; description: string | null;
  phone: string | null; whatsapp: string | null; email: string | null;
  address: string | null; zip: string | null; lat: number | null; lng: number | null;
  website: string | null; instagram: string | null; facebook: string | null;
  tiktok: string | null; youtube: string | null;
  hours: Record<string, string> | null; logo_url: string | null; banner_url: string | null;
  plan: string | null; featured: boolean | null; created_at: string; city_id: string | null;
  cities: { name: string; slug: string; state: string } | null;
  company_categories: CatLink[];
  company_media: Media[];
  // New Fase 1 fields
  founded_year: number | null;
  response_time_minutes: number | null;
  response_rate: number | null;
  services_completed: number | null;
  clients_served: number | null;
  price_range: number | null;
  tour_360_url: string | null;
  catalog_url: string | null;
  pricebook_url: string | null;
  portfolio_pdf_url: string | null;
  video_url: string | null;
  coverage_cities: string[] | null;
  differentials: string[] | null;
  badges: string[] | null;
  certifications: Certifications | null;
  quality_scores: QualityScores | null;
  promotions: Array<{ title?: string; description?: string }> | null;
  financing_info: { installments?: number; label?: string } | null;
  is_verified: boolean | null;
};

const WEEK_ORDER = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
const WEEK_FULL: Record<string, string> = {
  seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta",
  sex: "Sexta", sab: "Sábado", dom: "Domingo",
};
const JS_DAY_TO_KEY = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

function isOpenNow(hours: Record<string, string> | null): { open: boolean; label: string } {
  if (!hours) return { open: false, label: "Horário não informado" };
  const now = new Date();
  const todayKey = JS_DAY_TO_KEY[now.getDay()];
  // Find a key that covers today: exact key, or range like "seg-sex" / "seg-sab"
  const match = Object.entries(hours).find(([k]) => {
    if (k === todayKey) return true;
    const range = k.split("-");
    if (range.length !== 2) return false;
    const start = WEEK_ORDER.indexOf(range[0]);
    const end = WEEK_ORDER.indexOf(range[1]);
    const todayIdx = WEEK_ORDER.indexOf(todayKey);
    if (start < 0 || end < 0 || todayIdx < 0) return false;
    return todayIdx >= start && todayIdx <= end;
  });
  if (!match) return { open: false, label: "Fechado hoje" };
  const [, value] = match;
  const times = value.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
  if (!times) return { open: true, label: `Hoje: ${value}` };
  const minutes = now.getHours() * 60 + now.getMinutes();
  const startM = parseInt(times[1]) * 60 + parseInt(times[2]);
  const endM = parseInt(times[3]) * 60 + parseInt(times[4]);
  const open = minutes >= startM && minutes <= endM;
  return { open, label: open ? `Aberto agora · fecha às ${times[3]}:${times[4]}` : `Fechado · abre às ${times[1]}:${times[2]}` };
}

function copyToClipboard(text: string, label: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copiado!`));
  }
}

function CompanyPage() {
  const { slug } = Route.useParams();
  const q = useQuery(companyBySlugQueryOptions(slug));
  const company = q.data as Company | null | undefined;
  const reviews = useQuery({
    queryKey: ["reviews", company?.id ?? ""],
    queryFn: () => fetchCompanyReviews(company!.id),
    enabled: !!company?.id,
  });
  const similar = useQuery({
    queryKey: ["similar", company?.id ?? ""],
    queryFn: () => fetchSimilarCompanies({
      excludeId: company!.id,
      categoryIds: company!.company_categories.map((c) => (c.categories as { id?: string } | null)?.id).filter((x): x is string => !!x),
      cityId: company!.city_id,
      limit: 6,
    }),
    enabled: !!company?.id,
  });
  const coverageIds = company?.coverage_cities ?? [];
  const coverage = useQuery({
    queryKey: ["coverage", company?.id ?? "", coverageIds.join(",")],
    queryFn: () => fetchCitiesByIds(coverageIds),
    enabled: !!company?.id && coverageIds.length > 0,
  });

  // Track a page view once per session per company
  useEffect(() => {
    if (!company?.id) return;
    const key = `cv:${company.id}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    void supabase.from("company_views").insert({ company_id: company.id });
  }, [company?.id]);

  if (q.isSuccess && !company) throw notFound();
  if (!company) {
    return (
      <SiteLayout>
        <div className="container mx-auto p-10">
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
        </div>
      </SiteLayout>
    );
  }

  const ratings = (reviews.data ?? []).map((r) => r.rating);
  const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => r === star).length,
    pct: ratings.length ? (ratings.filter((r) => r === star).length / ratings.length) * 100 : 0,
  }));
  const recommendPct = ratings.length ? Math.round((ratings.filter((r) => r >= 4).length / ratings.length) * 100) : 0;

  const mapSrc = company.lat && company.lng
    ? `https://www.google.com/maps?q=${company.lat},${company.lng}&z=15&output=embed`
    : null;
  const directionsUrl = company.lat && company.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${company.lat},${company.lng}`
    : null;

  const status = isOpenNow(company.hours);
  const yearsActive = Math.max(1, Math.floor((Date.now() - new Date(company.created_at).getTime()) / (365 * 24 * 3600 * 1000)));
  const isPremium = company.plan === "premium";
  const isVerified = isPremium || company.featured || ratings.length > 0;

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrUrl = shareUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`
    : "";

  // Highlights derived from categories
  const services = company.company_categories
    .map((cc) => cc.categories?.name)
    .filter((x): x is string => !!x);

  // Payment methods (default common set; could be dynamic later)
  const paymentMethods = [
    { icon: CreditCard, label: "Cartão de crédito" },
    { icon: CreditCard, label: "Cartão de débito" },
    { icon: Wallet, label: "Pix" },
    { icon: Banknote, label: "Dinheiro" },
  ];

  const highlights = [
    { icon: Award, label: `${yearsActive}+ ano(s) no mercado` },
    { icon: ShieldCheck, label: isVerified ? "Empresa verificada" : "Cadastro confirmado" },
    { icon: ThumbsUp, label: ratings.length ? `${recommendPct}% recomendam` : "Pronta para atender" },
    { icon: Users, label: "Atende residencial e comercial" },
    { icon: Sparkles, label: "Orçamento sem compromisso" },
    { icon: Languages, label: "Atendimento em português" },
  ];

  const faqs = [
    { q: "Como faço para solicitar um orçamento?", a: `Você pode pedir um orçamento gratuito clicando em "Solicitar orçamento" no topo da página, ou falar direto pelo WhatsApp.` },
    { q: "A empresa atende minha região?", a: company.cities ? `${company.name} atende ${company.cities.name} (${company.cities.state}) e regiões próximas. Confira no mapa abaixo a localização exata.` : "Entre em contato para confirmar se a empresa atende sua região." },
    { q: "Quais formas de pagamento são aceitas?", a: "Cartão de crédito, débito, Pix e dinheiro. Confirme condições especiais diretamente com a empresa." },
    { q: "Como deixar uma avaliação?", a: "Após contratar o serviço, role até a seção 'Avaliações' e compartilhe sua experiência. Sua opinião ajuda outros clientes." },
  ];

  const breadcrumbs = [
    { to: "/", label: "Início" },
    company.cities ? { to: `/cidades/${company.cities.slug}`, label: company.cities.name } : null,
    services[0] && company.company_categories[0]?.categories ? { to: `/categoria/${company.company_categories[0].categories.slug}`, label: services[0] } : null,
    { to: null, label: company.name },
  ].filter(Boolean) as { to: string | null; label: string }[];

  return (
    <SiteLayout>
      {/* Banner */}
      <div className="relative h-56 w-full overflow-hidden bg-muted md:h-72">
        {company.banner_url ? (
          <img src={company.banner_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary to-primary-dark" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>

      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <nav className="mt-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              {b.to ? (
                <a href={b.to} className="hover:text-foreground">{b.label}</a>
              ) : (
                <span className="text-foreground">{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
            </span>
          ))}
        </nav>

        {/* Header card */}
        <div className="relative -mt-10 rounded-2xl border border-border bg-card p-5 shadow-lg md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <img
              src={company.logo_url ?? company.banner_url ?? ""}
              alt={company.name}
              className="h-24 w-24 rounded-xl border border-border bg-muted object-cover md:h-28 md:w-28"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold md:text-3xl">{company.name}</h1>
                {isPremium && (
                  <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                    <BadgeCheck className="mr-1 h-3 w-3" /> Premium
                  </Badge>
                )}
                {company.featured && (
                  <Badge className="bg-accent text-accent-foreground hover:bg-accent">Destaque</Badge>
                )}
                {isVerified && (
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                    <ShieldCheck className="mr-1 h-3 w-3" /> Verificada
                  </Badge>
                )}
              </div>
              {company.tagline && <p className="mt-1 text-muted-foreground">{company.tagline}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-accent text-accent" />
                  <strong className="text-foreground">{avg ? avg.toFixed(1) : "—"}</strong>
                  <span>({ratings.length} avaliações)</span>
                </span>
                {company.cities && (
                  <Link to="/cidades/$slug" params={{ slug: company.cities.slug }}
                    className="inline-flex items-center gap-1 hover:text-foreground">
                    <MapPin className="h-4 w-4" />
                    {company.cities.name} · {company.cities.state}
                  </Link>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  status.open ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                }`}>
                  <Clock className="h-3 w-3" /> {status.label}
                </span>
                {company.price_range ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80" title="Faixa de preço">
                    {"$".repeat(company.price_range)}
                  </span>
                ) : null}
              </div>
              <ResponseStatsRow
                responseTimeMinutes={company.response_time_minutes}
                responseRate={company.response_rate}
                servicesCompleted={company.services_completed}
                clientsServed={company.clients_served}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {company.company_categories.map((cc) => cc.categories ? (
                  <Link key={cc.categories.slug} to="/categoria/$slug" params={{ slug: cc.categories.slug }}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground/80 hover:bg-primary hover:text-primary-foreground">
                    {cc.categories.name}
                  </Link>
                ) : null)}
              </div>
            </div>
            <div className="grid w-full shrink-0 gap-2 md:w-56">
              {company.whatsapp && (
                <a href={waUrl(company.whatsapp, `Olá! Vi sua empresa no AgendaAqui.`)} target="_blank" rel="noreferrer">
                  <Button className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5d]">
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                  </Button>
                </a>
              )}
              {company.phone && (
                <a href={telUrl(company.phone)}>
                  <Button variant="outline" className="w-full">
                    <Phone className="mr-2 h-4 w-4" /> Ligar
                  </Button>
                </a>
              )}
              <QuoteDialog companyId={company.id} companyName={company.name} />
              <Button variant="ghost" className="w-full" onClick={() => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  navigator.share({ title: company.name, url: window.location.href }).catch(() => {});
                } else {
                  copyToClipboard(window.location.href, "Link");
                }
              }}>
                <Share2 className="mr-2 h-4 w-4" /> Compartilhar
              </Button>
              <div className="flex justify-center pt-1">
                <FavoriteButton companyId={company.id} className="relative" />
              </div>
            </div>
          </div>

          {/* Quick stats bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 md:grid-cols-4">
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-foreground">{avg ? avg.toFixed(1) : "—"}</div>
              <div className="text-xs text-muted-foreground">Nota média</div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-foreground">{ratings.length}</div>
              <div className="text-xs text-muted-foreground">Avaliações</div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-foreground">{yearsActive}+</div>
              <div className="text-xs text-muted-foreground">Ano(s) ativos</div>
            </div>
            <div className="text-center">
              <div className="font-display text-2xl font-bold text-foreground">{recommendPct || "—"}{ratings.length ? "%" : ""}</div>
              <div className="text-xs text-muted-foreground">Recomendam</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            {/* About */}
            {company.description && (
              <section className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold">Sobre {company.name}</h2>
                <p className="mt-3 whitespace-pre-line text-foreground/90">{company.description}</p>
              </section>
            )}

            {/* Highlights / Why choose us */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold">Por que escolher</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {highlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                    <h.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm font-medium">{h.label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Fase 2 — Reputação AgendaAqui */}
            <ReputationRing
              overrideScore={(company as unknown as { reputation_score?: number | null }).reputation_score ?? null}
              inputs={{
                avgRating: avg,
                reviewCount: ratings.length,
                responseTimeMinutes: company.response_time_minutes,
                responseRate: company.response_rate,
                isVerified: !!isVerified,
                hasPhotos: company.company_media.length > 0,
                profileCompleteness: Math.min(100,
                  (company.description ? 15 : 0) +
                  (company.logo_url ? 10 : 0) +
                  (company.banner_url ? 10 : 0) +
                  (company.phone ? 10 : 0) +
                  (company.whatsapp ? 10 : 0) +
                  (company.address ? 10 : 0) +
                  (company.hours ? 10 : 0) +
                  (company.company_media.length > 0 ? 10 : 0) +
                  ((company.differentials?.length ?? 0) > 0 ? 5 : 0) +
                  ((company.badges?.length ?? 0) > 0 ? 5 : 0) +
                  (company.website ? 5 : 0)
                ),
                yearsActive,
              }}
            />

            {/* Fase 2 — Estatísticas de satisfação */}
            <SatisfactionStats
              avgRating={avg}
              reviewCount={ratings.length}
              recommendPct={recommendPct}
              responseTimeMinutes={company.response_time_minutes}
              responseRate={company.response_rate}
              servicesCompleted={company.services_completed}
            />

            {/* Fase 2 — Prova social compacta */}
            <SocialProofBar
              reviewCount={ratings.length}
              servicesCompleted={company.services_completed}
              clientsServed={company.clients_served}
              yearsActive={yearsActive}
            />

            {/* Diferenciais (grid de ícones) */}
            <DifferentialsGrid differentials={company.differentials} />

            {/* Indicadores de qualidade estilo Booking */}
            <QualityBars scores={company.quality_scores} fallbackAvg={avg} />

            {/* Certificações e selos */}
            <CertificationsGrid
              certifications={company.certifications}
              badges={company.badges}
              isVerified={isVerified}
            />

            {/* Fase 2 — Linha do tempo */}
            <CompanyTimeline
              foundedYear={company.founded_year}
              createdAt={company.created_at}
              isVerified={!!isVerified}
              servicesCompleted={company.services_completed}
            />

            {/* Área de cobertura */}
            {coverage.data && coverage.data.length > 0 && (
              <CoverageArea cities={coverage.data} primaryCity={company.cities?.name ?? null} />
            )}

            {/* Downloads (catálogo, portfólio) */}
            {(company.catalog_url || company.pricebook_url || company.portfolio_pdf_url) && (
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2">
                  <Download className="h-5 w-5 text-primary" />
                  <h2 className="font-display text-xl font-bold">Downloads</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {company.catalog_url && (
                    <a href={company.catalog_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm font-medium hover:border-primary">
                      <FileText className="h-4 w-4 text-primary" /> Catálogo
                    </a>
                  )}
                  {company.pricebook_url && (
                    <a href={company.pricebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm font-medium hover:border-primary">
                      <FileText className="h-4 w-4 text-primary" /> Tabela de preços
                    </a>
                  )}
                  {company.portfolio_pdf_url && (
                    <a href={company.portfolio_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm font-medium hover:border-primary">
                      <FileText className="h-4 w-4 text-primary" /> Portfólio (PDF)
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Tour 360° */}
            {company.tour_360_url && (
              <section className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold">Tour 360°</h2>
                <div className="mt-4 aspect-video overflow-hidden rounded-lg border border-border">
                  <iframe src={company.tour_360_url} className="h-full w-full" title="Tour 360°" allowFullScreen />
                </div>
              </section>
            )}

            {/* Services offered */}
            {services.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold">Serviços oferecidos</h2>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {services.map((s) => (
                    <li key={s} className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium">{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Gallery */}
            {company.company_media.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold">Galeria</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {company.company_media.sort((a, b) => a.sort - b.sort).map((m) => (
                    <a key={m.id} href={m.url} target="_blank" rel="noreferrer">
                      <img src={m.url} alt="" loading="lazy" decoding="async"
                        className="aspect-square w-full rounded-lg object-cover transition-transform hover:scale-105" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Rating summary */}
            {ratings.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold">Resumo das avaliações</h2>
                <div className="mt-4 grid gap-6 md:grid-cols-[200px_1fr]">
                  <div className="text-center md:border-r md:border-border md:pr-6">
                    <div className="font-display text-5xl font-bold">{avg.toFixed(1)}</div>
                    <div className="mt-1 flex justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= Math.round(avg) ? "fill-accent text-accent" : "text-muted"}`} />
                      ))}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{ratings.length} avaliações</div>
                  </div>
                  <div className="space-y-2">
                    {distribution.map((d) => (
                      <div key={d.star} className="flex items-center gap-3 text-sm">
                        <span className="w-6 text-muted-foreground">{d.star}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-accent" style={{ width: `${d.pct}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs text-muted-foreground">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <ReviewsSection companyId={company.id} />

            {/* Fase 2 — Selos de segurança e confiança */}
            <TrustSeals
              isVerified={!!isVerified}
              hasCnpj={!!company.certifications?.cnpj}
              hasWarranty={!!company.certifications?.garantia || (company.differentials ?? []).includes("garantia")}
              invoiceIssued={!!company.certifications?.nota_fiscal || (company.differentials ?? []).includes("nota_fiscal")}
            />

            {/* FAQ */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold">Perguntas frequentes</h2>
              <div className="mt-4 space-y-3">
                {faqs.map((f, i) => (
                  <details key={i} className="group rounded-lg border border-border bg-background p-4">
                    <summary className="flex cursor-pointer items-center justify-between font-medium">
                      {f.q}
                      <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>

            {/* Similar companies */}
            {similar.data && similar.data.length > 0 && (
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold">Empresas similares</h2>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {similar.data.slice(0, 6).map((c) => (
                    <CompanyCard key={c.id} company={toCompanyCardData(c)} />
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            {/* Sticky quote / booking card */}
            <section className="rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-display text-lg font-bold">Orçamento instantâneo</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Receba orçamento em minutos, sem compromisso.</p>
              <div className="mt-3">
                <StatusPills open={status.open} statusLabel={status.label} responseTimeMinutes={company.response_time_minutes} />
              </div>
              <div className="mt-4 space-y-2">
                {company.whatsapp && (
                  <a href={waUrl(company.whatsapp, `Olá! Vi sua empresa no AgendaAqui.`)} target="_blank" rel="noreferrer" className="block">
                    <Button className="w-full bg-[#25D366] text-white hover:bg-[#1ebe5d]">
                      <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
                    </Button>
                  </a>
                )}
                <QuoteDialog companyId={company.id} companyName={company.name} />
                {company.phone && (
                  <a href={telUrl(company.phone)} className="block">
                    <Button variant="outline" className="w-full">
                      <Phone className="mr-2 h-4 w-4" /> Ligar
                    </Button>
                  </a>
                )}
              </div>
            </section>

            {/* Active promotion */}
            <PromotionBanner promotions={company.promotions} financing={company.financing_info} />

            {/* Social channels extra */}
            {(company.instagram || company.facebook || company.tiktok || company.youtube || company.website) && (
              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-display text-lg font-bold">Redes sociais</h3>
                <div className="mt-3">
                  <SocialLinksExtra
                    instagram={company.instagram}
                    facebook={company.facebook}
                    tiktok={company.tiktok}
                    youtube={company.youtube}
                    website={company.website}
                  />
                </div>
              </section>
            )}

            {/* Contact */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold">Contato</h3>
              <ul className="mt-3 space-y-3 text-sm">
                {company.address && (
                  <li className="flex items-start justify-between gap-2">
                    <span className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {company.address}</span>
                    <button onClick={() => copyToClipboard(company.address!, "Endereço")} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )}
                {company.phone && (
                  <li className="flex items-center justify-between gap-2">
                    <span className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 text-primary" /> {company.phone}</span>
                    <button onClick={() => copyToClipboard(company.phone!, "Telefone")} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )}
                {company.email && (
                  <li className="flex items-center justify-between gap-2">
                    <a href={`mailto:${company.email}`} className="flex gap-2 text-primary hover:underline">
                      <Mail className="mt-0.5 h-4 w-4" /> {company.email}
                    </a>
                    <button onClick={() => copyToClipboard(company.email!, "E-mail")} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </li>
                )}
                {company.website && (
                  <li className="flex gap-2"><Globe className="mt-0.5 h-4 w-4 text-primary" />
                    <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      {company.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                )}
                {company.instagram && (
                  <li className="flex gap-2"><Instagram className="mt-0.5 h-4 w-4 text-primary" />
                    <a href={`https://instagram.com/${company.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      @{company.instagram.replace(/^@/, "")}
                    </a>
                  </li>
                )}
                {company.facebook && (
                  <li className="flex gap-2"><Facebook className="mt-0.5 h-4 w-4 text-primary" /> {company.facebook}</li>
                )}
                {company.zip && (
                  <li className="flex gap-2"><Building2 className="mt-0.5 h-4 w-4 text-primary" /> CEP {company.zip}</li>
                )}
              </ul>
            </section>

            {/* Hours */}
            {company.hours && (
              <section className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">Horário</h3>
                  <span className={`text-xs font-medium ${status.open ? "text-emerald-600" : "text-muted-foreground"}`}>
                    {status.open ? "● Aberto" : "● Fechado"}
                  </span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-foreground/85">
                  {Object.entries(company.hours).map(([k, v]) => {
                    const label = k.includes("-")
                      ? k.split("-").map((d) => WEEK_FULL[d] ?? d).join(" a ")
                      : WEEK_FULL[k] ?? k;
                    return (
                      <li key={k} className="flex justify-between border-b border-border py-1.5 last:border-0">
                        <span>{label}</span>
                        <span className="font-medium">{v}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Payment methods */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold">Formas de pagamento</h3>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {paymentMethods.map((p, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-muted/40 p-2 text-xs font-medium">
                    <p.icon className="h-4 w-4 text-primary" /> {p.label}
                  </li>
                ))}
              </ul>
            </section>

            {/* Map + Directions */}
            {mapSrc && (
              <section className="overflow-hidden rounded-xl border border-border bg-card">
                <h3 className="border-b border-border px-6 py-4 font-display text-lg font-bold">Localização</h3>
                <iframe title="Mapa" src={mapSrc} className="h-64 w-full" loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade" />
                {directionsUrl && (
                  <a href={directionsUrl} target="_blank" rel="noreferrer" className="block">
                    <Button variant="outline" className="m-3 w-[calc(100%-1.5rem)]">
                      <Navigation className="mr-2 h-4 w-4" /> Como chegar
                    </Button>
                  </a>
                )}
              </section>
            )}

            {/* Quick actions */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold">Ações rápidas</h3>
              <div className="mt-3 grid gap-2">
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(shareUrl, "Link")}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar link
                </Button>
                <a href={`https://wa.me/?text=${encodeURIComponent(`${company.name} — ${shareUrl}`)}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="w-full">
                    <MessageCircle className="mr-2 h-4 w-4" /> Indicar no WhatsApp
                  </Button>
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(company.name)}&body=${encodeURIComponent(shareUrl)}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Mail className="mr-2 h-4 w-4" /> Indicar por e-mail
                  </Button>
                </a>
              </div>
            </section>

            {/* QR Code */}
            {qrUrl && (
              <section className="rounded-xl border border-border bg-card p-6 text-center">
                <h3 className="font-display text-lg font-bold">
                  <QrCode className="mr-1 inline h-4 w-4" /> Compartilhe
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">Aponte a câmera para abrir esta página</p>
                <img src={qrUrl} alt="QR Code" className="mx-auto mt-3 h-40 w-40 rounded-lg border border-border bg-white p-2" />
              </section>
            )}

            {/* Trust / report */}
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold">Informações úteis</h3>
              <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  Cadastrada em {new Date(company.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                  Dados verificados pelo AgendaAqui
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  Solicite orçamento sem compromisso
                </li>
              </ul>
            </section>
          </aside>
        </div>

        {/* Bottom CTA banner */}
        <div className="my-12 rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-8 text-center text-primary-foreground">
          <h3 className="font-display text-2xl font-bold">Gostou de {company.name}?</h3>
          <p className="mt-2 opacity-90">Solicite um orçamento agora mesmo, é rápido e gratuito.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {company.whatsapp && (
              <a href={waUrl(company.whatsapp, `Olá! Vi sua empresa no AgendaAqui.`)} target="_blank" rel="noreferrer">
                <Button size="lg" className="bg-[#25D366] text-white hover:bg-[#1ebe5d]">
                  <MessageCircle className="mr-2 h-5 w-5" /> Falar no WhatsApp
                </Button>
              </a>
            )}
            <QuoteDialog companyId={company.id} companyName={company.name} />
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

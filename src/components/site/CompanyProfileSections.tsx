import {
  ShieldCheck, BadgeCheck, Award, Crown, FileText, Sparkles, MapPin,
  MessageCircle, Phone, Wallet, Clock, CheckCircle2, Zap, Wrench, Star,
  Instagram, Facebook, Youtube, Music2, Globe, HandCoins, Trophy, ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// -----------------------------------------------------------------------------
// Quality scores (Booking-style bars)
// -----------------------------------------------------------------------------

export type QualityScores = {
  quality?: number;
  punctuality?: number;
  service?: number;
  cleanliness?: number;
  value?: number;
};

const QUALITY_LABELS: Array<{ key: keyof QualityScores; label: string }> = [
  { key: "quality", label: "Qualidade" },
  { key: "punctuality", label: "Pontualidade" },
  { key: "service", label: "Atendimento" },
  { key: "cleanliness", label: "Limpeza" },
  { key: "value", label: "Custo-benefício" },
];

export function QualityBars({
  scores,
  fallbackAvg = 0,
}: {
  scores?: QualityScores | null;
  fallbackAvg?: number;
}) {
  // If no explicit scores, derive them from the review average
  const base = fallbackAvg ? Math.min(5, fallbackAvg) : 0;
  const items = QUALITY_LABELS.map(({ key, label }) => {
    const raw = scores?.[key];
    const value = typeof raw === "number" && raw > 0 ? raw : base;
    return { key, label, value };
  });
  const hasAny = items.some((i) => i.value > 0);
  if (!hasAny) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Star className="h-5 w-5 fill-accent text-accent" />
        <h2 className="font-display text-xl font-bold">Indicadores de qualidade</h2>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const pct = Math.round((item.value / 5) * 100);
          return (
            <div key={item.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="font-display font-bold text-primary">{item.value.toFixed(1)}</span>
              </div>
              <Progress value={pct} className="h-2" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Certifications & badges
// -----------------------------------------------------------------------------

export type Certifications = {
  cnpj?: boolean;
  cpf_responsavel?: boolean;
  google_maps?: boolean;
  crea?: boolean;
  cau?: boolean;
  nota_fiscal?: boolean;
  garantia?: boolean;
};

const CERT_META: Array<{ key: keyof Certifications; label: string; icon: typeof BadgeCheck }> = [
  { key: "cnpj", label: "CNPJ validado", icon: BadgeCheck },
  { key: "cpf_responsavel", label: "CPF responsável", icon: BadgeCheck },
  { key: "google_maps", label: "Google Maps", icon: MapPin },
  { key: "crea", label: "CREA", icon: FileText },
  { key: "cau", label: "CAU", icon: FileText },
  { key: "nota_fiscal", label: "Nota fiscal", icon: FileText },
  { key: "garantia", label: "Garantia", icon: ShieldCheck },
];

const BADGE_META: Record<string, { label: string; icon: typeof Trophy; className: string }> = {
  mais_contratado: { label: "Mais contratado", icon: Trophy, className: "border-amber-400 bg-amber-50 text-amber-700" },
  top_atendimento: { label: "Top atendimento", icon: Award, className: "border-blue-400 bg-blue-50 text-blue-700" },
  entrega_garantida: { label: "Entrega garantida", icon: ShieldCheck, className: "border-emerald-400 bg-emerald-50 text-emerald-700" },
  especialista: { label: "Especialista", icon: Crown, className: "border-purple-400 bg-purple-50 text-purple-700" },
  parceiro: { label: "Parceiro AgendaAqui", icon: Sparkles, className: "border-primary/40 bg-primary/5 text-primary" },
  top_10: { label: "Top 10 da cidade", icon: Trophy, className: "border-amber-400 bg-amber-50 text-amber-700" },
};

export function CertificationsGrid({
  certifications,
  badges,
  isVerified,
}: {
  certifications?: Certifications | null;
  badges?: string[] | null;
  isVerified?: boolean;
}) {
  const activeCerts = CERT_META.filter((c) => certifications?.[c.key]);
  const activeBadges = (badges ?? []).map((b) => ({ key: b, ...BADGE_META[b] })).filter((b) => b.label);
  if (!isVerified && activeCerts.length === 0 && activeBadges.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-500" />
        <h2 className="font-display text-xl font-bold">Certificações e selos</h2>
      </div>

      {activeBadges.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeBadges.map((b) => {
            const Icon = b.icon;
            return (
              <span key={b.key} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${b.className}`}>
                <Icon className="h-3.5 w-3.5" /> {b.label}
              </span>
            );
          })}
        </div>
      )}

      {activeCerts.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeCerts.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.key} className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium">{c.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// -----------------------------------------------------------------------------
// Differentials (icon grid)
// -----------------------------------------------------------------------------

const DIFFERENTIAL_META: Record<string, { label: string; icon: typeof Sparkles }> = {
  orcamento_gratis: { label: "Orçamento grátis", icon: HandCoins },
  whatsapp: { label: "Atendimento via WhatsApp", icon: MessageCircle },
  visita_tecnica: { label: "Visita técnica", icon: Wrench },
  garantia: { label: "Garantia", icon: ShieldCheck },
  nota_fiscal: { label: "Nota fiscal", icon: FileText },
  verificada: { label: "Empresa verificada", icon: BadgeCheck },
  parcelamento: { label: "Parcelamento", icon: Wallet },
  atendimento_rapido: { label: "Atendimento rápido", icon: Zap },
};

export const DIFFERENTIAL_OPTIONS = Object.entries(DIFFERENTIAL_META).map(([value, meta]) => ({ value, label: meta.label }));

export function DifferentialsGrid({ differentials }: { differentials?: string[] | null }) {
  const items = (differentials ?? []).map((d) => ({ key: d, ...DIFFERENTIAL_META[d] })).filter((d) => d.label);
  if (items.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold">Diferenciais</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-4 text-center transition-transform hover:scale-105">
              <div className="rounded-full bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Coverage area
// -----------------------------------------------------------------------------

export function CoverageArea({
  cities,
  primaryCity,
}: {
  cities: { id: string; name: string; state: string }[];
  primaryCity?: string | null;
}) {
  if (cities.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Área de cobertura</h2>
      </div>
      {primaryCity && (
        <p className="mt-1 text-sm text-muted-foreground">Sede em {primaryCity}. Atende também:</p>
      )}
      <ul className="mt-4 flex flex-wrap gap-2">
        {cities.map((c) => (
          <li key={c.id}>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
              <MapPin className="h-3.5 w-3.5" />
              {c.name} · {c.state}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Extra social links (TikTok, YouTube, etc)
// -----------------------------------------------------------------------------

export function SocialLinksExtra({
  instagram,
  facebook,
  tiktok,
  youtube,
  website,
}: {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  website?: string | null;
}) {
  const links = [
    instagram ? { href: `https://instagram.com/${instagram.replace(/^@/, "")}`, icon: Instagram, label: "Instagram" } : null,
    facebook ? { href: facebook.startsWith("http") ? facebook : `https://facebook.com/${facebook}`, icon: Facebook, label: "Facebook" } : null,
    tiktok ? { href: `https://tiktok.com/@${tiktok.replace(/^@/, "")}`, icon: Music2, label: "TikTok" } : null,
    youtube ? { href: youtube.startsWith("http") ? youtube : `https://youtube.com/${youtube}`, icon: Youtube, label: "YouTube" } : null,
    website ? { href: website, icon: Globe, label: "Site" } : null,
  ].filter(Boolean) as { href: string; icon: typeof Instagram; label: string }[];

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary hover:text-primary"
          >
            <Icon className="h-3.5 w-3.5" />
            {link.label}
          </a>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Response stats badges (header)
// -----------------------------------------------------------------------------

export function ResponseStatsRow({
  responseTimeMinutes,
  responseRate,
  servicesCompleted,
  clientsServed,
}: {
  responseTimeMinutes?: number | null;
  responseRate?: number | null;
  servicesCompleted?: number | null;
  clientsServed?: number | null;
}) {
  const items = [
    responseTimeMinutes
      ? { icon: Zap, value: responseTimeMinutes < 60 ? `${responseTimeMinutes}min` : `${Math.round(responseTimeMinutes / 60)}h`, label: "Tempo de resposta" }
      : null,
    responseRate ? { icon: MessageCircle, value: `${responseRate}%`, label: "Taxa de resposta" } : null,
    servicesCompleted ? { icon: Wrench, value: servicesCompleted.toLocaleString("pt-BR"), label: "Serviços realizados" } : null,
    clientsServed ? { icon: ThumbsUp, value: clientsServed.toLocaleString("pt-BR"), label: "Clientes atendidos" } : null,
  ].filter(Boolean) as { icon: typeof Zap; value: string; label: string }[];

  if (items.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
            title={item.label}
          >
            <Icon className="h-3.5 w-3.5" /> {item.value}
            <span className="hidden font-normal opacity-70 sm:inline"> · {item.label}</span>
          </span>
        );
      })}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Active promotion banner
// -----------------------------------------------------------------------------

export function PromotionBanner({
  promotions,
  financing,
}: {
  promotions?: Array<{ title?: string; description?: string }> | null;
  financing?: { installments?: number; label?: string } | null;
}) {
  const promo = Array.isArray(promotions) && promotions.length > 0 ? promotions[0] : null;
  if (!promo && !financing?.installments) return null;

  return (
    <section className="rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-accent/20 p-2">
          <Sparkles className="h-5 w-5 text-accent-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          {promo?.title && <h3 className="font-display font-bold text-foreground">{promo.title}</h3>}
          {promo?.description && <p className="text-sm text-muted-foreground">{promo.description}</p>}
          {financing?.installments ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              <Wallet className="mr-1 inline h-4 w-4 text-primary" />
              Parcelamos em até {financing.installments}x{financing.label ? ` ${financing.label}` : " sem juros"}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Business status pill (open/closed + response time)
// -----------------------------------------------------------------------------

export function StatusPills({
  open,
  statusLabel,
  responseTimeMinutes,
}: {
  open: boolean;
  statusLabel: string;
  responseTimeMinutes?: number | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
          open ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${open ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
        {statusLabel}
      </span>
      {responseTimeMinutes ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-700">
          <Clock className="h-3 w-3" />
          Responde em ~{responseTimeMinutes < 60 ? `${responseTimeMinutes}min` : `${Math.round(responseTimeMinutes / 60)}h`}
        </span>
      ) : null}
    </div>
  );
}

// Re-export commonly used icon just to avoid extra imports in caller
export { Phone };

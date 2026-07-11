import { useMemo } from "react";
import {
  Award, Shield, TrendingUp, Users, Clock, MessageCircle, Star, CheckCircle2,
  Lock, FileCheck2, Verified, Calendar, Trophy, Sparkles, ThumbsUp, Zap,
} from "lucide-react";

// -----------------------------------------------------------------------------
// Reputation score (0-100 ring, Booking-style)
// -----------------------------------------------------------------------------

export type ReputationInputs = {
  avgRating: number;              // 0-5
  reviewCount: number;
  responseTimeMinutes?: number | null;
  responseRate?: number | null;   // 0-100
  isVerified?: boolean;
  hasPhotos?: boolean;
  profileCompleteness?: number;   // 0-100
  yearsActive?: number;
};

export type ReputationBreakdown = {
  score: number;             // 0-100
  parts: Array<{ label: string; value: number; max: number; icon: typeof Star }>;
  band: "excelente" | "muito bom" | "bom" | "regular" | "novo";
};

export function computeReputation(i: ReputationInputs): ReputationBreakdown {
  // Weighted parts summing to 100
  const ratingScore = Math.min(30, (i.avgRating / 5) * 30);
  const volumeScore = Math.min(15, Math.log10(Math.max(1, i.reviewCount)) * 10);
  const responseTime = i.responseTimeMinutes ?? 0;
  const respTimeScore = !responseTime
    ? 5
    : responseTime <= 30 ? 15
    : responseTime <= 60 ? 12
    : responseTime <= 180 ? 8
    : responseTime <= 720 ? 5
    : 3;
  const respRateScore = ((i.responseRate ?? 0) / 100) * 10;
  const verifiedScore = i.isVerified ? 10 : 0;
  const photoScore = i.hasPhotos ? 5 : 0;
  const completeScore = ((i.profileCompleteness ?? 50) / 100) * 10;
  const tenureScore = Math.min(5, (i.yearsActive ?? 0));

  const parts = [
    { label: "Avaliações", value: Math.round(ratingScore), max: 30, icon: Star },
    { label: "Volume de reviews", value: Math.round(volumeScore), max: 15, icon: Users },
    { label: "Tempo de resposta", value: Math.round(respTimeScore), max: 15, icon: Zap },
    { label: "Taxa de resposta", value: Math.round(respRateScore), max: 10, icon: MessageCircle },
    { label: "Empresa verificada", value: Math.round(verifiedScore), max: 10, icon: Verified },
    { label: "Perfil completo", value: Math.round(completeScore), max: 10, icon: FileCheck2 },
    { label: "Fotos e mídia", value: Math.round(photoScore), max: 5, icon: Sparkles },
    { label: "Tempo de mercado", value: Math.round(tenureScore), max: 5, icon: Calendar },
  ];
  const total = parts.reduce((s, p) => s + p.value, 0);
  const score = Math.min(100, Math.max(0, Math.round(total)));
  const band: ReputationBreakdown["band"] =
    score >= 90 ? "excelente"
    : score >= 75 ? "muito bom"
    : score >= 60 ? "bom"
    : score >= 40 ? "regular"
    : "novo";
  return { score, parts, band };
}

const BAND_META: Record<ReputationBreakdown["band"], { label: string; color: string; bg: string }> = {
  excelente: { label: "Excelente", color: "text-emerald-600", bg: "from-emerald-500/20 to-emerald-500/5" },
  "muito bom": { label: "Muito bom", color: "text-primary", bg: "from-primary/20 to-primary/5" },
  bom: { label: "Bom", color: "text-blue-600", bg: "from-blue-500/20 to-blue-500/5" },
  regular: { label: "Regular", color: "text-amber-600", bg: "from-amber-500/20 to-amber-500/5" },
  novo: { label: "Perfil novo", color: "text-muted-foreground", bg: "from-muted/60 to-muted/10" },
};

export function ReputationRing({ inputs, overrideScore }: { inputs: ReputationInputs; overrideScore?: number | null }) {
  const b = useMemo(() => computeReputation(inputs), [inputs]);
  const score = typeof overrideScore === "number" && overrideScore > 0 ? overrideScore : b.score;
  const meta = BAND_META[b.band];
  const circumference = 2 * Math.PI * 44;
  const dash = (score / 100) * circumference;

  return (
    <section className={`rounded-xl border border-border bg-gradient-to-br ${meta.bg} p-6`}>
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Reputação AgendaAqui</h2>
      </div>
      <div className="mt-4 flex flex-col items-center gap-6 md:flex-row md:items-start">
        <div className="relative flex shrink-0 items-center justify-center">
          <svg width="120" height="120" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/40" />
            <circle
              cx="50" cy="50" r="44" strokeWidth="8" fill="none" strokeLinecap="round"
              stroke="currentColor" className={meta.color}
              strokeDasharray={`${dash} ${circumference}`}
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-display text-3xl font-bold ${meta.color}`}>{score}</span>
            <span className="text-[10px] font-medium uppercase text-muted-foreground">de 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className={`inline-flex items-center gap-1 rounded-full bg-background/60 px-3 py-1 text-sm font-semibold ${meta.color}`}>
            <Award className="h-4 w-4" /> {meta.label}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Score calculado automaticamente com base em avaliações, tempo de resposta, verificação e completude do perfil.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {b.parts.map((p) => {
              const Icon = p.icon;
              const pct = Math.round((p.value / p.max) * 100);
              return (
                <li key={p.label} className="rounded-lg border border-border/50 bg-background/70 p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Icon className="h-3.5 w-3.5 text-primary" /> {p.label}
                    </span>
                    <span className="font-mono text-muted-foreground">{p.value}/{p.max}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-gradient-to-r from-primary to-primary/60" style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Satisfaction stats grid
// -----------------------------------------------------------------------------

export function SatisfactionStats({
  avgRating, reviewCount, recommendPct, responseTimeMinutes, responseRate, servicesCompleted,
}: {
  avgRating: number;
  reviewCount: number;
  recommendPct: number;
  responseTimeMinutes?: number | null;
  responseRate?: number | null;
  servicesCompleted?: number | null;
}) {
  const items = [
    { icon: ThumbsUp, value: `${recommendPct}%`, label: "Recomendam", tone: "text-emerald-600" },
    { icon: Star, value: avgRating ? avgRating.toFixed(1) : "—", label: `${reviewCount} avaliações`, tone: "text-accent" },
    responseTimeMinutes
      ? { icon: Zap, value: responseTimeMinutes < 60 ? `${responseTimeMinutes}min` : `${Math.round(responseTimeMinutes / 60)}h`, label: "Tempo médio de resposta", tone: "text-primary" }
      : null,
    responseRate ? { icon: MessageCircle, value: `${responseRate}%`, label: "Taxa de resposta", tone: "text-primary" } : null,
    servicesCompleted ? { icon: CheckCircle2, value: servicesCompleted.toLocaleString("pt-BR"), label: "Serviços realizados", tone: "text-emerald-600" } : null,
  ].filter(Boolean) as Array<{ icon: typeof Star; value: string; label: string; tone: string }>;

  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Satisfação dos clientes</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${it.tone}`} />
                <span className={`font-display text-2xl font-bold ${it.tone}`}>{it.value}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{it.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// History timeline
// -----------------------------------------------------------------------------

export function CompanyTimeline({
  foundedYear, createdAt, isVerified, servicesCompleted, milestones,
}: {
  foundedYear?: number | null;
  createdAt?: string;
  isVerified?: boolean;
  servicesCompleted?: number | null;
  milestones?: Array<{ year: number; title: string; description?: string }> | null;
}) {
  const events: Array<{ year: string; title: string; description?: string; icon: typeof Calendar }> = [];
  if (foundedYear) events.push({ year: String(foundedYear), title: "Fundação da empresa", description: `Início das atividades em ${foundedYear}.`, icon: Sparkles });
  if (createdAt) {
    const y = new Date(createdAt).getFullYear();
    events.push({ year: String(y), title: "Entrada no AgendaAqui", description: "Perfil publicado na plataforma.", icon: Calendar });
  }
  if (isVerified) events.push({ year: "★", title: "Empresa verificada", description: "Passou pela conferência de dados e documentos.", icon: Verified });
  if (servicesCompleted && servicesCompleted >= 100) {
    events.push({ year: `${servicesCompleted}+`, title: "Marca de serviços concluídos", description: "Atingiu um volume relevante de atendimentos.", icon: Trophy });
  }
  (milestones ?? []).forEach((m) => events.push({ year: String(m.year), title: m.title, description: m.description, icon: Award }));

  if (events.length === 0) return null;
  events.sort((a, b) => a.year.localeCompare(b.year));

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Linha do tempo</h2>
      </div>
      <ol className="relative mt-6 space-y-6 border-l-2 border-primary/20 pl-6">
        {events.map((ev, i) => {
          const Icon = ev.icon;
          return (
            <li key={i} className="relative">
              <span className="absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-sm font-bold text-primary">{ev.year}</span>
                <h3 className="font-semibold">{ev.title}</h3>
              </div>
              {ev.description && <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Trust & security seals
// -----------------------------------------------------------------------------

export function TrustSeals({
  isVerified, hasCnpj, hasWarranty, invoiceIssued,
}: {
  isVerified?: boolean;
  hasCnpj?: boolean;
  hasWarranty?: boolean;
  invoiceIssued?: boolean;
}) {
  const seals = [
    isVerified ? { icon: Verified, title: "Perfil verificado", desc: "Dados conferidos pela plataforma" } : null,
    hasCnpj ? { icon: FileCheck2, title: "CNPJ ativo", desc: "Empresa formalizada e ativa" } : null,
    hasWarranty ? { icon: Shield, title: "Garantia oferecida", desc: "Serviços com prazo de garantia" } : null,
    invoiceIssued ? { icon: FileCheck2, title: "Emite nota fiscal", desc: "Comprovação para o cliente" } : null,
    { icon: Lock, title: "Comunicação segura", desc: "Conversas protegidas na plataforma" },
  ].filter(Boolean) as Array<{ icon: typeof Shield; title: string; desc: string }>;

  return (
    <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-emerald-600" />
        <h2 className="font-display text-xl font-bold">Segurança e confiança</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {seals.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-background p-3">
              <div className="rounded-full bg-emerald-500/10 p-2">
                <Icon className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Social proof counter (mini)
// -----------------------------------------------------------------------------

export function SocialProofBar({
  reviewCount, servicesCompleted, clientsServed, yearsActive,
}: {
  reviewCount: number;
  servicesCompleted?: number | null;
  clientsServed?: number | null;
  yearsActive?: number;
}) {
  const items = [
    reviewCount ? { value: reviewCount.toLocaleString("pt-BR"), label: "avaliações" } : null,
    servicesCompleted ? { value: servicesCompleted.toLocaleString("pt-BR"), label: "serviços" } : null,
    clientsServed ? { value: clientsServed.toLocaleString("pt-BR"), label: "clientes" } : null,
    yearsActive ? { value: `${yearsActive}+`, label: "anos" } : null,
  ].filter(Boolean) as Array<{ value: string; label: string }>;

  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-around gap-4 rounded-xl border border-border bg-gradient-to-r from-primary/5 via-transparent to-primary/5 p-4">
      {items.map((it) => (
        <div key={it.label} className="text-center">
          <div className="font-display text-xl font-bold text-primary">{it.value}</div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

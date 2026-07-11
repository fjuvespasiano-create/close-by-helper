import { Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { useMemo } from "react";

type Company = Record<string, unknown>;

type CheckItem = {
  key: string;
  label: string;
  ok: boolean;
  weight: number;
  hint?: string;
  tab?: string;
};

function isFilled(v: unknown, min = 1): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length >= min;
  if (typeof v === "number") return v > 0;
  if (Array.isArray(v)) return v.length >= min;
  if (typeof v === "object") return Object.keys(v as object).length >= min;
  return !!v;
}

export function buildChecklist(c: Company): CheckItem[] {
  const certs = (c.certifications as Record<string, boolean> | undefined) ?? {};
  const qscores = (c.quality_scores as Record<string, number> | undefined) ?? {};
  const certCount = Object.values(certs).filter(Boolean).length;
  const qCount = Object.values(qscores).filter((v) => Number(v) > 0).length;

  return [
    { key: "logo", label: "Logo da empresa", ok: isFilled(c.logo_url), weight: 3, tab: "midia" },
    { key: "banner", label: "Banner de capa", ok: isFilled(c.banner_url), weight: 2, tab: "midia" },
    { key: "desc", label: "Descrição detalhada (mín. 100 caracteres)", ok: isFilled(c.description, 100), weight: 4, tab: "perfil" },
    { key: "tag", label: "Slogan/tagline", ok: isFilled(c.tagline, 8), weight: 1, tab: "perfil" },
    { key: "phone", label: "Telefone", ok: isFilled(c.phone), weight: 2, tab: "perfil" },
    { key: "wa", label: "WhatsApp", ok: isFilled(c.whatsapp), weight: 3, tab: "perfil" },
    { key: "email", label: "E-mail de contato", ok: isFilled(c.email), weight: 2, tab: "perfil" },
    { key: "addr", label: "Endereço completo", ok: isFilled(c.address, 10), weight: 2, tab: "perfil" },
    { key: "web", label: "Website próprio", ok: isFilled(c.website), weight: 1, tab: "perfil" },
    { key: "ig", label: "Instagram", ok: isFilled(c.instagram), weight: 1, tab: "perfil" },
    { key: "fb", label: "Facebook", ok: isFilled(c.facebook), weight: 1, tab: "perfil" },
    { key: "video", label: "Vídeo de apresentação", ok: isFilled(c.video_url), weight: 2, tab: "midia" },
    { key: "year", label: "Ano de fundação", ok: isFilled(c.founded_year), weight: 1, tab: "perfil" },
    { key: "price", label: "Faixa de preço", ok: isFilled(c.price_range), weight: 1, tab: "perfil" },
    { key: "rtime", label: "Tempo de resposta", ok: isFilled(c.response_time_minutes), weight: 2, tab: "reputacao" },
    { key: "rrate", label: "Taxa de resposta", ok: isFilled(c.response_rate), weight: 2, tab: "reputacao" },
    { key: "svc", label: "Serviços realizados", ok: isFilled(c.services_completed), weight: 1, tab: "reputacao" },
    { key: "cli", label: "Clientes atendidos", ok: isFilled(c.clients_served), weight: 1, tab: "reputacao" },
    { key: "diff", label: "3 ou mais diferenciais", ok: isFilled(c.differentials, 3), weight: 3, tab: "reputacao" },
    { key: "qual", label: "5 indicadores de qualidade preenchidos", ok: qCount >= 5, weight: 3, tab: "reputacao" },
    { key: "cov", label: "Cidades de cobertura", ok: isFilled(c.coverage_cities), weight: 2, tab: "cobertura" },
    { key: "cert", label: "2 ou mais certificações", ok: certCount >= 2, weight: 2, tab: "cert" },
    { key: "badge", label: "1 selo de reconhecimento", ok: isFilled(c.badges), weight: 1, tab: "cert" },
    { key: "verif", label: "Empresa verificada", ok: !!c.is_verified, weight: 4, hint: "Automático para plano Premium" },
  ];
}

export function computeScore(items: CheckItem[]) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  const done = items.reduce((s, i) => s + (i.ok ? i.weight : 0), 0);
  return Math.round((done / total) * 100);
}

export function ProfileCompleteness({ company, companyId, compact = false }: { company: Company; companyId: string; compact?: boolean }) {
  const items = useMemo(() => buildChecklist(company), [company]);
  const score = useMemo(() => computeScore(items), [items]);
  const missing = items.filter((i) => !i.ok);

  const tone =
    score >= 90 ? "text-emerald-600" : score >= 70 ? "text-blue-600" : score >= 50 ? "text-amber-600" : "text-destructive";
  const bar =
    score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-blue-500" : score >= 50 ? "bg-amber-500" : "bg-destructive";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-bold">Perfil completo</h3>
          <p className="text-xs text-muted-foreground">
            Perfis 100% completos aparecem melhor na busca e recebem mais contatos.
          </p>
        </div>
        <div className={`text-2xl font-bold tabular-nums ${tone}`}>{score}%</div>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${bar} transition-all`} style={{ width: `${score}%` }} />
      </div>

      {missing.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Tudo pronto! Seu perfil está 100% completo.
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Falta preencher ({missing.length})
          </p>
          <ul className="mt-2 space-y-1.5">
            {(compact ? missing.slice(0, 5) : missing).map((i) => (
              <li key={i.key}>
                <Link
                  to="/painel/empresas/$id"
                  params={{ id: companyId }}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2">
                    <Circle className="h-4 w-4 text-muted-foreground" />
                    <span>{i.label}</span>
                    {i.hint ? <span className="text-xs text-muted-foreground">· {i.hint}</span> : null}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
          {compact && missing.length > 5 ? (
            <Link to="/painel/empresas/$id" params={{ id: companyId }} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
              Ver todos os {missing.length} itens →
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

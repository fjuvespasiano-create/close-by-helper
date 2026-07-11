import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Eye, MessageSquare, Star, Crown, TrendingUp } from "lucide-react";
import { useAdmin } from "@/hooks/use-admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/painel/ranking")({
  head: () => ({ meta: [{ title: "Ranking semanal — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: RankingPage,
});

type RankRow = {
  rank_position: number;
  company_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  city_id: string | null;
  visits: number;
  activity: number;
  reviews: number;
  avg_rating: number;
  score: number;
  is_self: boolean;
};

async function fetchRanking(): Promise<{ ok: true; rows: RankRow[] } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc("get_weekly_ranking");
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data ?? []) as RankRow[] };
}

function RankingPage() {
  const { userId } = useAdmin();
  const q = useQuery({
    queryKey: ["weekly-ranking", userId],
    queryFn: fetchRanking,
    enabled: !!userId,
    staleTime: 60_000,
  });

  const data = q.data;
  const isForbidden = data && !data.ok && /premium|autentic/i.test(data.error);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Ranking semanal Premium</h1>
          <p className="text-sm text-muted-foreground">Classificação das empresas Premium nos últimos 7 dias.</p>
        </div>
      </div>

      {q.isLoading ? (
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : isForbidden ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Crown className="mx-auto h-10 w-10 text-accent" />
          <p className="mt-3 font-display text-lg font-bold">Recurso exclusivo Premium</p>
          <p className="mt-1 max-w-md mx-auto text-sm text-muted-foreground">
            O ranking semanal está disponível apenas para donos de empresas com plano Premium ativo.
            Faça upgrade para acompanhar sua posição, visitas, contatos e avaliações da semana.
          </p>
          <Link to="/planos"><Button className="mt-6">Ver planos Premium</Button></Link>
        </div>
      ) : data && !data.ok ? (
        <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar o ranking: {data.error}
        </div>
      ) : data && data.ok && data.rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Ainda sem dados nesta semana.</p>
        </div>
      ) : data && data.ok ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Legend icon={<Eye className="h-4 w-4" />} label="Visitas" hint="peso ×1" />
            <Legend icon={<MessageSquare className="h-4 w-4" />} label="Atividade" hint="contatos · peso ×5" />
            <Legend icon={<Star className="h-4 w-4" />} label="Avaliações" hint="peso ×8 + média ×4" />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden grid-cols-[64px_1fr_80px_80px_80px_100px] gap-3 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <span>#</span>
              <span>Empresa</span>
              <span className="text-right">Visitas</span>
              <span className="text-right">Atividade</span>
              <span className="text-right">Avaliações</span>
              <span className="text-right">Pontos</span>
            </div>
            <ul className="divide-y divide-border">
              {data.rows.map((r) => (
                <li
                  key={r.company_id}
                  className={`grid grid-cols-[48px_1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[64px_1fr_80px_80px_80px_100px] ${
                    r.is_self ? "bg-primary/5" : ""
                  }`}
                >
                  <PositionBadge pos={r.rank_position} />
                  <div className="min-w-0 flex items-center gap-3">
                    {r.logo_url ? (
                      <img src={r.logo_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" loading="lazy" />
                    ) : (
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <Link
                        to="/empresa/$slug"
                        params={{ slug: r.slug }}
                        className="block truncate font-medium text-foreground hover:text-primary"
                      >
                        {r.name}
                      </Link>
                      {r.is_self && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Sua empresa</span>
                      )}
                    </div>
                  </div>
                  <Metric icon={<Eye className="h-3.5 w-3.5" />} value={r.visits} className="hidden md:flex" />
                  <Metric icon={<MessageSquare className="h-3.5 w-3.5" />} value={r.activity} className="hidden md:flex" />
                  <Metric icon={<Star className="h-3.5 w-3.5" />} value={`${r.reviews}${r.avg_rating > 0 ? ` · ${Number(r.avg_rating).toFixed(1)}` : ""}`} className="hidden md:flex" />
                  <div className="text-right">
                    <div className="font-display text-lg font-bold text-foreground">{Math.round(Number(r.score))}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground md:hidden">
                      {r.visits}v · {r.activity}c · {r.reviews}★
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Fórmula: visitas ×1 + contatos ×5 + avaliações ×8 + média das notas ×4. Atualiza a cada acesso.
          </p>
        </>
      ) : null}
    </div>
  );
}

function Legend({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">{icon}</span>
      <div>
        <div className="font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
    </div>
  );
}

function Metric({ icon, value, className = "" }: { icon: React.ReactNode; value: number | string; className?: string }) {
  return (
    <div className={`items-center justify-end gap-1.5 text-right text-sm text-foreground ${className}`}>
      <span className="text-muted-foreground">{icon}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function PositionBadge({ pos }: { pos: number }) {
  const medal =
    pos === 1 ? "bg-amber-100 text-amber-700 border-amber-300"
    : pos === 2 ? "bg-slate-100 text-slate-700 border-slate-300"
    : pos === 3 ? "bg-orange-100 text-orange-700 border-orange-300"
    : "bg-muted text-muted-foreground border-border";
  return (
    <div className={`grid h-10 w-10 place-items-center rounded-xl border font-display font-bold ${medal}`}>
      {pos}
    </div>
  );
}

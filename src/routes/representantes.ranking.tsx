import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { CalendarCheck, Trophy, TrendingDown, TrendingUp } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import {
  CITY_NAME,
  fetchMonthlyRanking,
  formatRoleParty,
  RepresentativeAvatar,
  representativesKeys,
  sortByAbsences,
  sortByActivity,
  sortByPresence,
  topN,
  type RankingRow,
} from "@/features/representatives";

export const Route = createFileRoute("/representantes/ranking")({
  component: RankingPage,
});

function RankingPage() {
  const { city: citySlug } = useSelectedCity();
  const cityName = CITY_NAME[citySlug];
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: representativesKeys.ranking(citySlug),
    queryFn: () => fetchMonthlyRanking(citySlug),
  });

  const byActivity = useMemo(() => topN(sortByActivity(rows), 10), [rows]);
  const byAbsences = useMemo(() => topN(sortByAbsences(rows), 10), [rows]);
  const byPresence = useMemo(() => topN(sortByPresence(rows), 10), [rows]);

  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link to="/representantes" className="hover:text-primary">← Representantes</Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" /> Ranking do mês · {cityName}
          </h1>
          <p className="text-muted-foreground mt-2 capitalize">{monthName}</p>
        </div>
      </section>

      <section className="container py-8 grid gap-6 lg:grid-cols-3">
        <RankingCard
          title="Mais ativos"
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          rows={byActivity}
          metric={(r) => `${r.activities_count} ${r.activities_count === 1 ? "atividade" : "atividades"}`}
          emptyMsg="Nenhuma atividade registrada este mês."
          loading={isLoading}
        />
        <RankingCard
          title="Mais faltas em sessões"
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          rows={byAbsences}
          metric={(r) => `${r.absences_count} de ${r.sessions_count} sessões`}
          emptyMsg="Sem dados de presença registrados."
          loading={isLoading}
        />
        <RankingCard
          title="Melhor assiduidade"
          icon={<CalendarCheck className="h-5 w-5 text-blue-500" />}
          rows={byPresence}
          metric={(r) => `${r.attendance_rate}% de presença`}
          emptyMsg="Sem dados de presença registrados."
          loading={isLoading}
        />
      </section>
    </SiteLayout>
  );
}

type RankingCardProps = {
  title: string;
  icon: ReactNode;
  rows: RankingRow[];
  metric: (r: RankingRow) => string;
  emptyMsg: string;
  loading: boolean;
};

function RankingCard({ title, icon, rows, metric, emptyMsg, loading }: RankingCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h2 className="font-semibold">{title}</h2>
        </div>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">{emptyMsg}</div>
        ) : (
          <ol className="space-y-2">
            {rows.map((r, idx) => (
              <li key={r.representative.id}>
                <Link
                  to="/representantes/$id"
                  params={{ id: r.representative.slug }}
                  className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition"
                >
                  <div className="w-6 text-center font-bold text-sm text-muted-foreground">{idx + 1}</div>
                  <RepresentativeAvatar
                    name={r.representative.name}
                    photoUrl={r.representative.photo_url}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.representative.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatRoleParty(r.representative.role, r.representative.party)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{metric(r)}</Badge>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

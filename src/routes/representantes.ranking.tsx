import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import { fetchMonthlyRanking, ROLE_LABEL } from "@/lib/representatives";
import { Trophy, TrendingUp, TrendingDown, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/representantes/ranking")({
  component: RankingPage,
});

function RankingPage() {
  const { city: citySlug } = useSelectedCity();
  const cityName = citySlug === "vespasiano" ? "Vespasiano" : "São José da Lapa";
  const monthName = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["rep-ranking", citySlug],
    queryFn: () => fetchMonthlyRanking(citySlug),
  });

  const byActivity = [...rows].sort((a, b) => b.activities_count - a.activities_count).slice(0, 10);
  const byAbsences = [...rows]
    .filter((r) => r.sessions_count > 0)
    .sort((a, b) => b.absences_count - a.absences_count)
    .slice(0, 10);
  const byPresence = [...rows]
    .filter((r) => r.sessions_count > 0)
    .sort((a, b) => b.attendance_rate - a.attendance_rate)
    .slice(0, 10);

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
  icon: React.ReactNode;
  rows: Array<{
    representative: { id: string; slug: string; name: string; role: keyof typeof ROLE_LABEL; party: string | null; photo_url: string | null };
    activities_count: number;
    absences_count: number;
    sessions_count: number;
    attendance_rate: number;
  }>;
  metric: (r: RankingCardProps["rows"][number]) => string;
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
                  {r.representative.photo_url ? (
                    <img src={r.representative.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-semibold">
                      {r.representative.name.split(" ").slice(0, 2).map((p) => p[0]).join("")}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.representative.name}</div>
                    <div className="text-xs text-muted-foreground">{ROLE_LABEL[r.representative.role]}{r.representative.party ? ` · ${r.representative.party}` : ""}</div>
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

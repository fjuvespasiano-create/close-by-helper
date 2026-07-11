import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import {
  fetchActivityFeed,
  KIND_META,
  STATUS_LABEL,
  ROLE_LABEL,
  type ActivityKind,
  type ActivityStatus,
} from "@/lib/representatives";
import { Radio, ExternalLink, RefreshCw, Filter } from "lucide-react";

export const Route = createFileRoute("/representantes/feed")({
  component: FeedPage,
});

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 36e5);
  if (h < 1) return "agora";
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function FeedPage() {
  const { city: citySlug } = useSelectedCity();
  const [kind, setKind] = useState<"all" | ActivityKind>("all");
  const [status, setStatus] = useState<"all" | ActivityStatus>("all");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 120_000);
    return () => clearInterval(id);
  }, []);

  const { data: items = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["rep-feed", citySlug, kind, status, tick],
    queryFn: () =>
      fetchActivityFeed({
        citySlug,
        kind: kind === "all" ? undefined : kind,
        status: status === "all" ? undefined : status,
      }),
  });

  const cityName = citySlug === "vespasiano" ? "Vespasiano" : "São José da Lapa";

  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Link to="/representantes" className="hover:text-primary">← Representantes</Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="relative inline-flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            Feed ao vivo · {cityName}
          </h1>
          <p className="text-muted-foreground mt-2">
            O que seus representantes fizeram nos últimos 60 dias. Atualiza sozinho a cada 2 minutos.
          </p>
        </div>
      </section>

      <section className="container py-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" /> {items.length} {items.length === 1 ? "atividade" : "atividades"}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {(Object.keys(KIND_META) as ActivityKind[]).map((k) => (
                  <SelectItem key={k} value={k}>{KIND_META[k].emoji} {KIND_META[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(STATUS_LABEL) as ActivityStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border p-10 text-center text-muted-foreground">
            <Radio className="mx-auto h-8 w-8 mb-3 opacity-40" />
            Nenhuma atividade encontrada para os filtros selecionados. Volte em breve — o sistema busca novidades toda madrugada.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => {
              const meta = KIND_META[a.kind] ?? KIND_META.outro;
              return (
                <li key={a.id}>
                  <Card>
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-lg ${meta.color}`}>
                          {meta.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                            {a.status && (
                              <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[a.status]}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">{timeAgo(a.occurred_at)}</span>
                          </div>
                          <div className="font-medium leading-snug">{a.title}</div>
                          {a.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                            {a.representative && (
                              <Link
                                to="/representantes/$id"
                                params={{ id: a.representative.slug }}
                                className="text-primary hover:underline"
                              >
                                {ROLE_LABEL[a.representative.role]} {a.representative.name}
                              </Link>
                            )}
                            {a.source_url && (
                              <a
                                href={a.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                              >
                                Fonte oficial <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CitySwitch } from "@/components/site/CitySwitch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSelectedCity, CITY_OPTIONS } from "@/hooks/useSelectedCity";
import { fetchAgoraFeed, AGORA_KIND_META, type AgoraItem, type AgoraKind } from "@/lib/agora";
import { cn } from "@/lib/utils";
import { RefreshCw, Zap } from "lucide-react";

export const Route = createFileRoute("/agora")({
  head: () => ({
    meta: [
      { title: "Agora na sua cidade — o que está rolando em tempo real | AgenddaAqui" },
      { name: "description", content: "Feed ao vivo com eventos de hoje, promoções expirando, novas vagas, editais abertos e novidades no marketplace de Vespasiano e São José da Lapa." },
      { property: "og:title", content: "Agora na sua cidade | AgenddaAqui" },
      { property: "og:description", content: "Tudo que está acontecendo agora na sua cidade em um só lugar." },
    ],
  }),
  component: AgoraPage,
});

const FILTERS: { key: AgoraKind | "todos"; label: string }[] = [
  { key: "todos", label: "Tudo" },
  { key: "evento", label: "Eventos" },
  { key: "promocao", label: "Promoções" },
  { key: "vaga", label: "Vagas" },
  { key: "edital", label: "Editais" },
  { key: "marketplace", label: "Marketplace" },
];

function AgoraPage() {
  const { city } = useSelectedCity();
  const cityName = CITY_OPTIONS.find((c) => c.slug === city)?.name ?? city;
  const [filter, setFilter] = useState<AgoraKind | "todos">("todos");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["agora-feed", city],
    queryFn: () => fetchAgoraFeed(city, 60),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return filter === "todos" ? data : data.filter((i) => i.kind === filter);
  }, [data, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: data?.length ?? 0 };
    for (const it of data ?? []) c[it.kind] = (c[it.kind] ?? 0) + 1;
    return c;
  }, [data]);

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 -z-10 opacity-40">
          <div className="absolute top-10 left-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            AO VIVO
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
            Agora em <span className="text-primary">{cityName}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground md:text-lg">
            Eventos de hoje, promoções expirando, vagas fresquinhas, editais abertos e o que acabou de entrar no marketplace — tudo num só feed.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <CitySwitch />
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section className="sticky top-14 z-30 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex gap-2 overflow-x-auto px-4 py-3">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const n = counts[f.key] ?? 0;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {f.label}
                {n > 0 && (
                  <span className={cn("rounded-full px-1.5 text-xs", active ? "bg-primary-foreground/20" : "bg-muted")}>
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Feed */}
      <section className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState cityName={cityName} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <FeedCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function FeedCard({ item }: { item: AgoraItem }) {
  const meta = AGORA_KIND_META[item.kind];
  return (
    <Link to={item.href} className="group block">
      <Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
        {item.image ? (
          <div className="relative aspect-[16/9] overflow-hidden bg-muted">
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            {item.urgent && (
              <div className="absolute right-2 top-2">
                <Badge className="bg-red-500 text-white shadow-lg">
                  <Zap className="mr-1 h-3 w-3" />
                  Urgente
                </Badge>
              </div>
            )}
          </div>
        ) : null}
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", meta.color)}>
              <span>{meta.emoji}</span>
              {meta.label}
            </span>
            {item.badge && (
              <Badge variant={item.urgent ? "destructive" : "secondary"} className="text-xs">
                {item.badge}
              </Badge>
            )}
          </div>
          <h3 className="line-clamp-2 font-semibold leading-tight group-hover:text-primary">{item.title}</h3>
          {item.subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{item.subtitle}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({ cityName }: { cityName: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed p-8 text-center">
      <div className="text-4xl">🌙</div>
      <h3 className="mt-3 font-semibold">Tudo tranquilo em {cityName} agora</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tudo tranquilo por aqui nas últimas horas. Ative as notificações e a gente te avisa assim que rolar algo novo na cidade.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/eventos">Ver agenda</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/promocoes">Ver promoções</Link>
        </Button>
      </div>
    </div>
  );
}

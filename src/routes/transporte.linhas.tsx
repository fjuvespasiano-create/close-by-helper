import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bus, Clock, ExternalLink, Search, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchBusLines, findNextDepartures, type BusLine } from "@/lib/bus";

export const Route = createFileRoute("/transporte/linhas")({
  head: () => ({
    meta: [
      { title: "Horários de Ônibus — Vespasiano e São José da Lapa" },
      {
        name: "description",
        content:
          "Consulte os horários atualizados de todas as linhas metropolitanas DER-MG que operam em Vespasiano e São José da Lapa.",
      },
      { property: "og:title", content: "Horários de Ônibus — AgenddaAqui" },
      {
        property: "og:description",
        content:
          "Todos os horários das linhas metropolitanas (DER-MG) em Vespasiano e São José da Lapa, sincronizados semanalmente.",
      },
    ],
  }),
  component: BusLinesPage,
});

type CityFilter = "todas" | "vespasiano" | "sao-jose-da-lapa";

function BusLinesPage() {
  const [city, setCity] = useState<CityFilter>("todas");
  const [search, setSearch] = useState("");

  const { data: lines = [], isLoading } = useQuery({
    queryKey: ["bus-lines"],
    queryFn: () => fetchBusLines(),
    staleTime: 60_000 * 30,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return lines.filter((l) => {
      if (city !== "todas" && l.city_slug !== city) return false;
      if (!term) return true;
      return (
        l.code.toLowerCase().includes(term) ||
        l.name.toLowerCase().includes(term) ||
        l.departures.some((d) => d.origin.toLowerCase().includes(term))
      );
    });
  }, [lines, city, search]);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/transporte">
            <ArrowLeft className="h-4 w-4" />
            Voltar para transporte
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Bus className="h-6 w-6 text-primary" />
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Horários de Ônibus Metropolitano
          </h1>
        </div>
        <p className="text-muted-foreground">
          Todas as linhas DER-MG que passam por Vespasiano e São José da Lapa. Horários
          sincronizados semanalmente com{" "}
          <a
            href="https://movemetropolitano.com.br"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            movemetropolitano.com.br
          </a>
          .
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <Tabs value={city} onValueChange={(v) => setCity(v as CityFilter)} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="vespasiano">Vespasiano</TabsTrigger>
            <TabsTrigger value="sao-jose-da-lapa">SJL</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, nome ou ponto (ex.: 500C, Vilarinho)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bus className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">Nenhuma linha encontrada</p>
            <p className="mt-1 text-sm">
              {lines.length === 0
                ? "Os horários ainda serão carregados na próxima sincronização automática."
                : "Ajuste os filtros ou o termo de busca."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {filtered.map((line) => (
            <BusLineItem key={line.id} line={line} />
          ))}
        </Accordion>
      )}
    </div>
  );
}

function BusLineItem({ line }: { line: BusLine }) {
  const next = findNextDepartures(line, 3);
  return (
    <AccordionItem
      value={line.id}
      className="rounded-lg border bg-card px-4 shadow-sm"
    >
      <AccordionTrigger className="hover:no-underline">
        <div className="flex flex-1 items-center gap-3 pr-4 text-left">
          <Badge variant="secondary" className="font-mono">
            {line.code}
          </Badge>
          <div className="flex-1">
            <div className="font-medium">{line.name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{line.city_slug === "vespasiano" ? "Vespasiano" : "São José da Lapa"}</span>
              {line.fare != null && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Ticket className="h-3 w-3" />
                    R$ {line.fare.toFixed(2).replace(".", ",")}
                  </span>
                </>
              )}
              {next.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <Clock className="h-3 w-3" />
                    Próxima: {next[0].time}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-2">
        {line.departures.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem horários registrados.</p>
        ) : (
          <div className="space-y-4">
            {groupByOrigin(line.departures).map((group) => (
              <div key={group.origin}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Partidas — {group.origin}
                </h3>
                <div className="space-y-3">
                  {group.days.map((d) => (
                    <div key={d.day_type}>
                      <div className="mb-1 text-xs font-medium text-foreground/70">
                        {d.day_type}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {d.times.map((t, i) => (
                          <span
                            key={`${t}-${i}`}
                            className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span>
            {line.raw_updated_at
              ? `Atualizado em ${line.raw_updated_at}`
              : `Última sincronização: ${new Date(line.last_scraped_at).toLocaleDateString("pt-BR")}`}
          </span>
          <a
            href={line.source_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-primary hover:underline"
          >
            Ver na fonte oficial
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function groupByOrigin(deps: BusDeparture[]) {
  const map = new Map<string, { origin: string; days: BusDeparture[] }>();
  for (const d of deps) {
    if (!map.has(d.origin)) map.set(d.origin, { origin: d.origin, days: [] });
    map.get(d.origin)!.days.push(d);
  }
  return Array.from(map.values());
}

type BusDeparture = BusLine["departures"][number];

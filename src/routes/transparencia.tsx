import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listProcurements } from "@/lib/procurements.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Calendar, Building2, Search, Paperclip, ChevronLeft, ChevronRight } from "lucide-react";

type SearchState = {
  q: string;
  city: string;
  modality: string;
  status: "open" | "suspended" | "canceled" | "finished" | "unknown" | "all";
  page: number;
};

export const Route = createFileRoute("/transparencia")({
  head: () => ({
    meta: [
      { title: "Editais e Licitações — Vespasiano e São José da Lapa | AgenddaAqui" },
      {
        name: "description",
        content:
          "Editais de licitação, pregões, dispensas e chamadas públicas das prefeituras de Vespasiano e São José da Lapa. Consulte objeto, datas e documentos oficiais.",
      },
      { property: "og:title", content: "Editais e Licitações — AgenddaAqui" },
      {
        property: "og:description",
        content: "Todos os editais das prefeituras de Vespasiano e São José da Lapa em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    q: (s.q as string) || "",
    city: (s.city as string) || "",
    modality: (s.modality as string) || "",
    status: ((s.status as string) || "all") as SearchState["status"],
    page: Number(s.page) || 1,
  }),
  component: TransparenciaPage,
});

const MODALITY_LABEL: Record<string, string> = {
  pregao_eletronico: "Pregão Eletrônico",
  pregao_presencial: "Pregão Presencial",
  tomada_precos: "Tomada de Preços",
  concorrencia: "Concorrência",
  dispensa: "Dispensa",
  inexigibilidade: "Inexigibilidade",
  chamada_publica: "Chamada Pública",
  outros: "Outros",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Aberto",
  suspended: "Suspenso",
  canceled: "Cancelado",
  finished: "Encerrado",
  unknown: "—",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  suspended: "secondary",
  canceled: "destructive",
  finished: "outline",
  unknown: "outline",
};

function fmtDate(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}
function fmtDateTime(d?: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function fmtCurrency(v?: number | null) {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function TransparenciaPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/transparencia" });
  const list = useServerFn(listProcurements);
  const [qLocal, setQLocal] = useState(search.q);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["procurements", search],
    queryFn: () =>
      list({
        data: {
          q: search.q || undefined,
          citySlug: search.city || undefined,
          modality: search.modality || undefined,
          status: search.status,
          page: search.page,
          pageSize: 20,
        },
      }),
  });

  function apply(next: Partial<SearchState>) {
    navigate({ search: (prev) => ({ ...prev, ...next, page: next.page ?? 1 }) });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/5 py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <FileText className="h-3.5 w-3.5" /> Transparência Municipal
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Editais e Licitações <span className="text-primary">da sua cidade</span>
            </h1>
            <p className="mt-3 text-muted-foreground sm:text-lg">
              Todos os editais publicados pelas prefeituras de Vespasiano e São José da Lapa, atualizados diariamente
              direto dos portais oficiais.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply({ q: qLocal });
            }}
            className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-[1fr_180px_200px_140px]"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                placeholder="Buscar por objeto, número..."
                className="pl-9"
              />
            </div>
            <Select value={search.city || "all"} onValueChange={(v) => apply({ city: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                <SelectItem value="vespasiano">Vespasiano</SelectItem>
                <SelectItem value="sao-jose-da-lapa">São José da Lapa</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={search.modality || "all"}
              onValueChange={(v) => apply({ modality: v === "all" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Modalidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas modalidades</SelectItem>
                {Object.entries(MODALITY_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={search.status} onValueChange={(v) => apply({ status: v as SearchState["status"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="open">Abertos</SelectItem>
                <SelectItem value="suspended">Suspensos</SelectItem>
                <SelectItem value="canceled">Cancelados</SelectItem>
                <SelectItem value="finished">Encerrados</SelectItem>
              </SelectContent>
            </Select>
          </form>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {isLoading && (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card/50" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
            Não conseguimos carregar os editais agora. Tente novamente em instantes.
          </div>
        )}

        {data && data.items.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhum edital encontrado com esses filtros.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Os editais são atualizados todo dia às 04h. Volte em breve ou limpe os filtros.
            </p>
          </div>
        )}

        {data && data.items.length > 0 && (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {data.total.toLocaleString("pt-BR")} edital{data.total === 1 ? "" : "is"} encontrado
              {data.total === 1 ? "" : "s"}
            </p>

            <div className="grid gap-4">
              {data.items.map((it) => {
                const cityName =
                  data.cities.find((c) => c.id === it.city_id)?.name ?? "—";
                const files = Array.isArray(it.files) ? (it.files as Array<{ name?: string; url: string }>) : [];
                return (
                  <article
                    key={it.id}
                    className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant={STATUS_VARIANT[it.status] ?? "outline"}>
                            {STATUS_LABEL[it.status] ?? it.status}
                          </Badge>
                          {it.modality && (
                            <Badge variant="secondary">{MODALITY_LABEL[it.modality] ?? it.modality}</Badge>
                          )}
                          {it.external_id && (
                            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                              {it.external_id}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" /> {cityName}
                          </span>
                        </div>
                        <h2 className="font-display text-lg font-bold leading-snug">{it.title}</h2>
                        {it.object && (
                          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{it.object}</p>
                        )}
                        {it.agency && (
                          <p className="mt-1 text-xs text-muted-foreground">Órgão: {it.agency}</p>
                        )}
                      </div>
                      <a
                        href={it.source_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
                      >
                        Ver no portal <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-3">
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Publicação: <strong className="text-foreground">{fmtDate(it.publish_date)}</strong>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Abertura: <strong className="text-foreground">{fmtDateTime(it.opening_date)}</strong>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Prazo: <strong className="text-foreground">{fmtDateTime(it.deadline_date)}</strong>
                      </div>
                    </div>

                    {it.estimated_value != null && (
                      <p className="mt-2 text-sm">
                        Valor estimado: <strong>{fmtCurrency(it.estimated_value)}</strong>
                      </p>
                    )}

                    {files.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {files.slice(0, 5).map((f, i) => (
                          <a
                            key={i}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                          >
                            <Paperclip className="h-3 w-3" />
                            {f.name || `Arquivo ${i + 1}`}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={search.page <= 1}
                  onClick={() => apply({ page: search.page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {search.page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={search.page >= totalPages}
                  onClick={() => apply({ page: search.page + 1 })}
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </SiteLayout>
  );
}

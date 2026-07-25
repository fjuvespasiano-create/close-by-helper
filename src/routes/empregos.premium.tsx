import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Sparkles } from "lucide-react";
import { z } from "zod";


import { SiteLayout } from "@/components/site/SiteLayout";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listPremiumJobs } from "@/lib/jobs.functions";
import {
  CITY_OPTIONS, PremiumJobCard, jobsKeys, type PremiumJobRow,
} from "@/features/jobs";

const searchSchema = z.object({
  city: z.string().catch("").default(""),
});

export const Route = createFileRoute("/empregos/premium")({
  head: () => ({
    meta: [
      { title: "Vagas em destaque — AgenddaAqui" },
      { name: "description", content: "Vagas premium selecionadas com informações detalhadas: requisitos, benefícios, faixa salarial e cultura da empresa." },
      { property: "og:title", content: "Vagas em destaque — AgenddaAqui" },
      { property: "og:description", content: "Oportunidades premium curadas para Vespasiano e São José da Lapa." },
    ],
  }),
  validateSearch: searchSchema,
  component: PremiumJobsPage,
});

function PremiumJobsPage() {
  const { city } = Route.useSearch();
  const navigate = useNavigate({ from: "/empregos/premium" });
  const premium = useServerFn(listPremiumJobs);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: jobsKeys.premium({ city: city || undefined, limit: 30 }),
    queryFn: () => premium({ data: { city: city || undefined, limit: 30 } }),
    staleTime: 60_000,
  });

  return (
    <SiteLayout>
      <section className="border-b border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-background to-background py-10">
        <div className="container mx-auto px-4">
          <Link to="/empregos" search={{ q: "", remote: "all", employment: "", experience: "", salaryMin: 0, sort: "recent", page: 1, city: "" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Todas as vagas
          </Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <Sparkles className="h-3.5 w-3.5" /> Curadoria AgenddaAqui
              </div>
              <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
                Vagas em <span className="text-amber-600 dark:text-amber-400">destaque</span>
              </h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Oportunidades premium com informações completas: requisitos, benefícios, faixa salarial e como a empresa trabalha.
              </p>
            </div>
            <Select value={city || "all"} onValueChange={(v) => navigate({ search: { ...DEFAULT_SEARCH, city: v === "all" ? "" : v } })}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {CITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-amber-500" />
            <h2 className="font-display text-xl font-bold">Ainda não há vagas em destaque</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Novas oportunidades premium são publicadas semanalmente. Confira as vagas normais enquanto isso.
            </p>
            <Link to="/empregos" search={{ q: "", remote: "all", employment: "", experience: "", salaryMin: 0, sort: "recent", page: 1, city: "" }} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Ver todas as vagas →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((j) => <PremiumJobCard key={(j as unknown as PremiumJobRow).id} job={j as unknown as PremiumJobRow} />)}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

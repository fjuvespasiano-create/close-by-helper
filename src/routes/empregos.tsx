import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Bookmark, BookmarkCheck, Briefcase, ChevronDown, Search, SlidersHorizontal, Sparkles, X,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listJobs, jobFacets, listPremiumJobs } from "@/lib/jobs.functions";
import {
  CITY_OPTIONS,
  DEFAULT_SEARCH,
  EMPLOYMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  JobCard,
  PAGE_SIZE,
  PremiumJobCard,
  SALARY_OPTIONS,
  jobsKeys,
  parseSearchParams,
  useSavedSearches,
  type JobRow,
  type PremiumJobRow,
  type SearchState,
} from "@/features/jobs";

export const Route = createFileRoute("/empregos")({
  head: () => ({
    meta: [
      { title: "Empregos em Vespasiano e região — AgenddaAqui" },
      { name: "description", content: "Vagas de emprego atualizadas em Vespasiano, São José da Lapa e oportunidades remotas. Filtre por cargo, contrato, experiência e salário." },
      { property: "og:title", content: "Empregos em Vespasiano e região — AgenddaAqui" },
      { property: "og:description", content: "Vagas atualizadas na sua cidade e oportunidades remotas." },
    ],
  }),
  validateSearch: parseSearchParams,
  component: EmpregosPage,
});

function EmpregosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/empregos" });
  const list = useServerFn(listJobs);
  const facets = useServerFn(jobFacets);
  const premium = useServerFn(listPremiumJobs);

  const [qLocal, setQLocal] = useState(search.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { saved, add: addSaved, remove: removeSaved } = useSavedSearches();

  useEffect(() => { setQLocal(search.q); }, [search.q]);

  // Debounce free-text search.
  useEffect(() => {
    if (qLocal === search.q) return;
    const t = setTimeout(() => {
      navigate({ search: (prev: SearchState) => ({ ...prev, q: qLocal, page: 1 }) });
    }, 350);
    return () => clearTimeout(t);
  }, [qLocal, search.q, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: jobsKeys.list(search),
    queryFn: () => list({ data: {
      q: search.q || undefined,
      city: search.city || undefined,
      remote: search.remote,
      employment: search.employment || undefined,
      experience: search.experience || undefined,
      salaryMin: search.salaryMin || undefined,
      sort: search.sort,
      page: search.page,
      pageSize: PAGE_SIZE,
    } }),
  });

  const { data: facetData } = useQuery({
    queryKey: jobsKeys.facets(),
    queryFn: () => facets(),
    staleTime: 5 * 60_000,
  });

  const { data: premiumJobs = [] } = useQuery({
    queryKey: jobsKeys.premium({ city: search.city || undefined, limit: 6 }),
    queryFn: () => premium({ data: { city: search.city || undefined, limit: 6 } }),
    staleTime: 60_000,
  });

  const employmentOptions = useMemo(() => {
    const fromDb = (facetData?.employment ?? []).map((v) => ({ value: v, label: v }));
    const seen = new Set(fromDb.map((o) => o.value.toLowerCase()));
    return [...fromDb, ...EMPLOYMENT_OPTIONS.filter((o) => !seen.has(o.value.toLowerCase()))];
  }, [facetData]);

  const experienceOptions = useMemo(() => {
    const fromDb = (facetData?.experience ?? []).map((v) => ({ value: v, label: v }));
    const seen = new Set(fromDb.map((o) => o.value.toLowerCase()));
    return [...fromDb, ...EXPERIENCE_OPTIONS.filter((o) => !seen.has(o.value.toLowerCase()))];
  }, [facetData]);

  function apply(next: Partial<SearchState>) {
    navigate({ search: (prev: SearchState) => ({ ...prev, ...next, page: next.page ?? 1 }) });
  }

  const activeFilters = [
    search.city && { key: "city", label: search.city, clear: () => apply({ city: "" }) },
    search.remote !== "all" && {
      key: "remote",
      label: search.remote === "yes" ? "Remoto" : "Presencial",
      clear: () => apply({ remote: "all" }),
    },
    search.employment && { key: "employment", label: search.employment, clear: () => apply({ employment: "" }) },
    search.experience && { key: "experience", label: search.experience, clear: () => apply({ experience: "" }) },
    search.salaryMin && {
      key: "salary",
      label: `${SALARY_OPTIONS.find((o) => o.value === search.salaryMin)?.label ?? `R$ ${search.salaryMin}+`}`,
      clear: () => apply({ salaryMin: 0 }),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const hasCustomFilters = activeFilters.length > 0 || !!search.q;

  function clearAll() {
    setQLocal("");
    navigate({ search: () => DEFAULT_SEARCH });
  }

  function saveCurrent() {
    if (!hasCustomFilters) { toast.info("Ajuste algum filtro antes de salvar."); return; }
    const suggested = [search.q, search.city, search.employment, search.experience].filter(Boolean).join(" · ") || "Minha busca";
    const name = window.prompt("Nome desta busca", suggested)?.trim();
    if (!name) return;
    addSaved(name, search);
    toast.success("Busca salva");
  }

  const showPremiumStrip = !hasCustomFilters && premiumJobs.length > 0;

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/5 py-12 md:py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Briefcase className="h-3.5 w-3.5" /> Vagas atualizadas todo dia
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Empregos em Vespasiano <span className="text-primary">e região</span>
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Filtre por cargo, contrato, experiência e faixa salarial — grátis, sem cadastro.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); apply({ q: qLocal }); }}
              className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={qLocal}
                  onChange={(e) => setQLocal(e.target.value)}
                  placeholder="Cargo, empresa ou palavra-chave"
                  className="border-0 pl-10 shadow-none focus-visible:ring-0"
                  aria-label="Buscar vagas"
                />
                {qLocal && (
                  <button
                    type="button"
                    onClick={() => setQLocal("")}
                    aria-label="Limpar busca"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={search.city || "all"} onValueChange={(v) => apply({ city: v === "all" ? "" : v })}>
                <SelectTrigger className="border-0 sm:w-[200px]"><SelectValue placeholder="Cidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {CITY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="submit" size="lg">Buscar</Button>
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
              {(["all", "no", "yes"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => apply({ remote: r })}
                  className={`rounded-full border px-4 py-1.5 font-medium transition ${
                    search.remote === r
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {r === "all" ? "Todas" : r === "yes" ? "🌐 Remoto" : "📍 Presencial"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        {showPremiumStrip && (
          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold">
                <Sparkles className="h-5 w-5 text-amber-500" /> Vagas em destaque
              </h2>
              <Link to="/empregos/premium" className="text-sm font-medium text-primary hover:underline">
                Ver todas →
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {premiumJobs.map((j) => <PremiumJobCard key={j.id} job={j as PremiumJobRow} />)}
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
            className="gap-2"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtros avançados
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </Button>

          <div className="ml-auto flex items-center gap-2">
            <Select value={search.sort} onValueChange={(v) => apply({ sort: v as SearchState["sort"] })}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="salary_desc">Maior salário</SelectItem>
                <SelectItem value="salary_asc">Menor salário</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={saveCurrent} className="gap-2">
              <Bookmark className="h-4 w-4" /> Salvar busca
            </Button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
            <FilterSelect label="Contrato" value={search.employment} onChange={(v) => apply({ employment: v })} options={employmentOptions} />
            <FilterSelect label="Nível" value={search.experience} onChange={(v) => apply({ experience: v })} options={experienceOptions} />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Salário mínimo</label>
              <Select value={String(search.salaryMin || 0)} onValueChange={(v) => apply({ salaryMin: Number(v) })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SALARY_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="ghost" size="sm" onClick={clearAll} disabled={!hasCustomFilters} className="w-full gap-2">
                <X className="h-4 w-4" /> Limpar tudo
              </Button>
            </div>
          </div>
        )}

        {activeFilters.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Ativos:</span>
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={f.clear}
                className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                {f.label}
                <X className="h-3 w-3 opacity-70 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {saved.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
              <BookmarkCheck className="h-3.5 w-3.5" /> Suas buscas:
            </span>
            {saved.map((s) => (
              <span key={s.name} className="group inline-flex items-center overflow-hidden rounded-full border border-border bg-card text-xs">
                <button
                  onClick={() => navigate({ search: () => s.params })}
                  className="px-3 py-1 font-medium text-foreground transition hover:bg-muted"
                >
                  {s.name}
                </button>
                <button
                  onClick={() => removeSaved(s.name)}
                  aria-label={`Remover ${s.name}`}
                  className="border-l border-border px-2 py-1 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : !data || data.rows.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Briefcase className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="font-display text-xl font-bold">Nenhuma vaga encontrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">Tente ajustar os filtros ou volte mais tarde — publicamos novidades todos os dias.</p>
            {hasCustomFilters && (
              <Button variant="outline" size="sm" onClick={clearAll} className="mt-4">Limpar filtros</Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{data.total}</strong> {data.total === 1 ? "vaga" : "vagas"}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.rows.map((j) => <JobCard key={j.id} job={j as JobRow} />)}
            </div>
            {data.total > data.pageSize && (
              <div className="mt-8 flex justify-center gap-2">
                <Button variant="outline" disabled={search.page <= 1} onClick={() => apply({ page: search.page - 1 })}>Anterior</Button>
                <Button variant="outline" disabled={search.page * data.pageSize >= data.total} onClick={() => apply({ page: search.page + 1 })}>Próxima</Button>
              </div>
            )}
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

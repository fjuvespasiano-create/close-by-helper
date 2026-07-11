import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { listJobs, jobFacets } from "@/lib/jobs.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase, MapPin, Wifi, Building2, Search, SlidersHorizontal,
  X, Bookmark, BookmarkCheck, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

type SearchState = {
  q: string;
  city: string;
  remote: "all" | "yes" | "no";
  employment: string;
  experience: string;
  salaryMin: number;
  sort: "recent" | "salary_desc" | "salary_asc";
  page: number;
};

export const Route = createFileRoute("/empregos")({
  head: () => ({
    meta: [
      { title: "Empregos em Vespasiano e região — AgenddaAqui" },
      { name: "description", content: "Vagas de emprego atualizadas em Vespasiano, São José da Lapa e oportunidades remotas. Filtre por cargo, contrato, experiência e salário." },
      { property: "og:title", content: "Empregos em Vespasiano e região — AgenddaAqui" },
      { property: "og:description", content: "Vagas atualizadas na sua cidade e oportunidades remotas." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): SearchState => ({
    q: (s.q as string) || "",
    city: (s.city as string) || "",
    remote: ((s.remote as string) || "all") as SearchState["remote"],
    employment: (s.employment as string) || "",
    experience: (s.experience as string) || "",
    salaryMin: Number(s.salaryMin) || 0,
    sort: ((s.sort as string) || "recent") as SearchState["sort"],
    page: Number(s.page) || 1,
  }),
  component: EmpregosPage,
});

const EMPLOYMENT_OPTIONS = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Temporário", label: "Temporário" },
  { value: "Freelancer", label: "Freelancer" },
  { value: "Estágio", label: "Estágio" },
  { value: "Jovem Aprendiz", label: "Jovem Aprendiz" },
];

const EXPERIENCE_OPTIONS = [
  { value: "Estágio", label: "Estágio" },
  { value: "Júnior", label: "Júnior" },
  { value: "Pleno", label: "Pleno" },
  { value: "Sênior", label: "Sênior" },
  { value: "Especialista", label: "Especialista" },
];

const SALARY_OPTIONS = [
  { value: 0, label: "Qualquer" },
  { value: 1500, label: "R$ 1,5k+" },
  { value: 2500, label: "R$ 2,5k+" },
  { value: 4000, label: "R$ 4k+" },
  { value: 6000, label: "R$ 6k+" },
  { value: 10000, label: "R$ 10k+" },
];

const SAVED_KEY = "empregos_saved_searches";

type SavedSearch = { name: string; params: SearchState };

function loadSaved(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as SavedSearch[]) : [];
  } catch { return []; }
}

function persistSaved(list: SavedSearch[]) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

function EmpregosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/empregos" });
  const list = useServerFn(listJobs);
  const facets = useServerFn(jobFacets);

  const [qLocal, setQLocal] = useState(search.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saved, setSaved] = useState<SavedSearch[]>([]);

  useEffect(() => { setSaved(loadSaved()); }, []);
  useEffect(() => { setQLocal(search.q); }, [search.q]);

  // Debounce free-text search: 350ms after last keystroke, push to URL.
  useEffect(() => {
    if (qLocal === search.q) return;
    const t = setTimeout(() => {
      navigate({ search: (prev: SearchState) => ({ ...prev, q: qLocal, page: 1 }) });
    }, 350);
    return () => clearTimeout(t);
  }, [qLocal, search.q, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", search],
    queryFn: () => list({ data: {
      q: search.q || undefined,
      city: search.city || undefined,
      remote: search.remote,
      employment: search.employment || undefined,
      experience: search.experience || undefined,
      salaryMin: search.salaryMin || undefined,
      sort: search.sort,
      page: search.page,
      pageSize: 20,
    } }),
  });

  const { data: facetData } = useQuery({
    queryKey: ["jobs-facets"],
    queryFn: () => facets(),
    staleTime: 5 * 60_000,
  });

  const employmentOptions = useMemo(() => {
    const fromDb = (facetData?.employment ?? []).map((v) => ({ value: v, label: v }));
    const seen = new Set(fromDb.map((o) => o.value.toLowerCase()));
    return [
      ...fromDb,
      ...EMPLOYMENT_OPTIONS.filter((o) => !seen.has(o.value.toLowerCase())),
    ];
  }, [facetData]);

  const experienceOptions = useMemo(() => {
    const fromDb = (facetData?.experience ?? []).map((v) => ({ value: v, label: v }));
    const seen = new Set(fromDb.map((o) => o.value.toLowerCase()));
    return [
      ...fromDb,
      ...EXPERIENCE_OPTIONS.filter((o) => !seen.has(o.value.toLowerCase())),
    ];
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
    navigate({ search: () => ({ q: "", city: "", remote: "all", employment: "", experience: "", salaryMin: 0, sort: "recent", page: 1 }) });
  }

  function saveCurrent() {
    if (!hasCustomFilters) {
      toast.info("Ajuste algum filtro antes de salvar.");
      return;
    }
    const suggested = [search.q, search.city, search.employment, search.experience].filter(Boolean).join(" · ") || "Minha busca";
    const name = window.prompt("Nome desta busca", suggested)?.trim();
    if (!name) return;
    const next = [{ name, params: search }, ...saved.filter((s) => s.name !== name)].slice(0, 10);
    setSaved(next);
    persistSaved(next);
    toast.success("Busca salva");
  }

  function removeSaved(name: string) {
    const next = saved.filter((s) => s.name !== name);
    setSaved(next);
    persistSaved(next);
  }

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
                  <SelectItem value="Vespasiano">Vespasiano</SelectItem>
                  <SelectItem value="São José da Lapa">São José da Lapa</SelectItem>
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
        {/* Toolbar: filters + sort + save */}
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

        {/* Advanced filters panel */}
        {filtersOpen && (
          <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-up">
            <FilterSelect
              label="Contrato"
              value={search.employment}
              onChange={(v) => apply({ employment: v })}
              options={employmentOptions}
            />
            <FilterSelect
              label="Nível"
              value={search.experience}
              onChange={(v) => apply({ experience: v })}
              options={experienceOptions}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Salário mínimo</label>
              <Select
                value={String(search.salaryMin || 0)}
                onValueChange={(v) => apply({ salaryMin: Number(v) })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SALARY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={!hasCustomFilters}
                className="w-full gap-2"
              >
                <X className="h-4 w-4" /> Limpar tudo
              </Button>
            </div>
          </div>
        )}

        {/* Active filter chips */}
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

        {/* Saved searches */}
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
              {data.rows.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
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
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type JobRow = {
  id: string;
  title: string;
  company_name: string | null;
  location_city: string | null;
  location_state: string | null;
  is_remote: boolean;
  employment_type: string | null;
  experience_level?: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  apply_url: string | null;
  posted_at: string | null;
};

function JobCard({ job }: { job: JobRow }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  return (
    <Link
      to="/empregos/$id"
      params={{ id: job.id }}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-16px_rgb(15_23_42/0.22)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-display text-base font-bold group-hover:text-primary">{job.title}</h3>
        {job.is_remote && (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <Wifi className="mr-0.5 inline h-3 w-3" /> Remoto
          </span>
        )}
      </div>
      {job.company_name && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" /> {job.company_name}
        </p>
      )}
      {(job.location_city || job.location_state) && !job.is_remote && (
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {[job.location_city, job.location_state].filter(Boolean).join(" · ")}
        </p>
      )}
      {(job.employment_type || job.experience_level) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {job.employment_type && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {job.employment_type}
            </span>
          )}
          {job.experience_level && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {job.experience_level}
            </span>
          )}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-xs text-muted-foreground">{formatDate(job.posted_at)}</span>
        {salary && <span className="text-sm font-semibold text-primary">{salary}</span>}
      </div>
    </Link>
  );
}

function formatSalary(min: number | null, max: number | null, currency: string | null) {
  if (!min && !max) return null;
  const c = currency === "USD" ? "US$" : "R$";
  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : `${n}`;
  if (min && max) return `${c} ${fmt(min)}–${fmt(max)}`;
  return `${c} ${fmt((min ?? max)!)}`;
}

function formatDate(iso: string | null) {
  if (!iso) return "Recente";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

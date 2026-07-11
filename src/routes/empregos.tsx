import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listJobs } from "@/lib/jobs.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Wifi, ExternalLink, Building2, Search } from "lucide-react";

export const Route = createFileRoute("/empregos")({
  head: () => ({
    meta: [
      { title: "Empregos em Vespasiano e região — AgenddaAqui" },
      { name: "description", content: "Vagas de emprego atualizadas em Vespasiano, São José da Lapa e oportunidades remotas. Busque por área, cidade e nível de experiência." },
      { property: "og:title", content: "Empregos em Vespasiano e região — AgenddaAqui" },
      { property: "og:description", content: "Vagas atualizadas na sua cidade e oportunidades remotas." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: (s.q as string) || "",
    city: (s.city as string) || "",
    remote: ((s.remote as string) || "all") as "all" | "yes" | "no",
    page: Number(s.page) || 1,
  }),
  component: EmpregosPage,
});

function EmpregosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/empregos" });
  const list = useServerFn(listJobs);
  const [qLocal, setQLocal] = useState(search.q);

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", search],
    queryFn: () => list({ data: {
      q: search.q || undefined,
      city: search.city || undefined,
      remote: search.remote,
      page: search.page,
      pageSize: 20,
    } }),
  });

  function apply(next: Partial<typeof search>) {
    navigate({ search: (prev: typeof search) => ({ ...prev, ...next, page: next.page ?? 1 }) });
  }

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/5 py-14">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Briefcase className="h-3.5 w-3.5" /> Vagas atualizadas todo dia
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Empregos em Vespasiano <span className="text-primary">e região</span>
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Vagas locais e oportunidades remotas — gratuito e sem cadastro.
            </p>

            <form
              onSubmit={(e) => { e.preventDefault(); apply({ q: qLocal }); }}
              className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={qLocal}
                  onChange={(e) => setQLocal(e.target.value)}
                  placeholder="Cargo, área ou palavra-chave"
                  className="border-0 pl-10 shadow-none focus-visible:ring-0"
                />
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

      <section className="container mx-auto px-4 py-10">
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

type JobRow = {
  id: string;
  title: string;
  company_name: string | null;
  location_city: string | null;
  location_state: string | null;
  is_remote: boolean;
  employment_type: string | null;
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
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
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

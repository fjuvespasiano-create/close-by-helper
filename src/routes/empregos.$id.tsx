import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getJob } from "@/lib/jobs.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Briefcase, MapPin, Wifi, Building2, ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/empregos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da vaga — AgenddaAqui" },
    ],
  }),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-display text-2xl font-bold">Erro ao carregar vaga</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-6" onClick={() => { reset(); router.invalidate(); }}>Tentar novamente</Button>
        </div>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Vaga não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">Esta vaga pode ter sido preenchida ou removida.</p>
        <Link to="/empregos"><Button className="mt-6">Ver outras vagas</Button></Link>
      </div>
    </SiteLayout>
  ),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const fetchJob = useServerFn(getJob);
  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: () => fetchJob({ data: { id } }),
  });

  if (isLoading) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-3xl px-4 py-12">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-8 h-64 animate-pulse rounded-2xl bg-muted" />
        </div>
      </SiteLayout>
    );
  }
  if (!job) throw notFound();

  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/empregos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Todas as vagas
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                <Briefcase className="mr-1 inline h-3.5 w-3.5" /> Vaga
              </span>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{job.title}</h1>
              {job.company_name && (
                <p className="mt-2 flex items-center gap-1.5 text-lg text-muted-foreground">
                  <Building2 className="h-4 w-4" /> {job.company_name}
                </p>
              )}
            </div>
            {job.is_remote && (
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                <Wifi className="mr-1 inline h-3 w-3" /> Remoto
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {(job.location_city || job.location_state) && (
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {[job.location_city, job.location_state].filter(Boolean).join(" · ")}</span>
            )}
            {job.employment_type && <span>💼 {job.employment_type}</span>}
            {job.experience_level && <span>📊 {job.experience_level}</span>}
          </div>

          {job.description && (
            <div className="prose prose-sm mt-6 max-w-none whitespace-pre-wrap text-foreground dark:prose-invert">
              {job.description}
            </div>
          )}

          {job.tags && job.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {job.tags.map((t: string) => (
                <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{t}</span>
              ))}
            </div>
          )}

          {job.apply_url && (
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="gap-2">
                  Candidatar-se <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              <Link to="/empregos"><Button variant="outline" size="lg">Ver outras vagas</Button></Link>
            </div>
          )}

          {job.job_sources && (
            <p className="mt-6 text-xs text-muted-foreground">Fonte: {(job.job_sources as { name: string }).name}</p>
          )}
        </div>
      </article>
    </SiteLayout>
  );
}

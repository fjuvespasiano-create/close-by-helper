import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Briefcase, Building2, CalendarClock, Check, ExternalLink, Mail,
  MapPin, MessageCircle, Sparkles, Wifi,
} from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { getJob } from "@/lib/jobs.functions";
import { jobsKeys, formatSalary, type JobDetail } from "@/features/jobs";

export const Route = createFileRoute("/empregos/$id")({
  head: () => ({ meta: [{ title: "Detalhes da vaga — AgenddaAqui" }] }),
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
  component: JobDetailPage,
});

function JobDetailPage() {
  const { id } = Route.useParams();
  const fetchJob = useServerFn(getJob);
  const { data: job, isLoading } = useQuery({
    queryKey: jobsKeys.detail(id),
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

  const j = job as unknown as JobDetail;
  return j.is_premium ? <PremiumLayout job={j} /> : <StandardLayout job={j} />;
}

function StandardLayout({ job }: { job: JobDetail }) {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 py-10">
        <Link to="/empregos" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Todas as vagas
        </Link>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <JobHeader job={job} />
          <MetaRow job={job} />
          {job.description && (
            <div className="prose prose-sm mt-6 max-w-none whitespace-pre-wrap text-foreground dark:prose-invert">
              {job.description}
            </div>
          )}
          {job.tags && job.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {job.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{t}</span>
              ))}
            </div>
          )}
          <ApplyCTA job={job} />
          {job.job_sources && (
            <p className="mt-6 text-xs text-muted-foreground">Fonte: {job.job_sources.name}</p>
          )}
        </div>
      </article>
    </SiteLayout>
  );
}

function PremiumLayout({ job }: { job: JobDetail }) {
  return (
    <SiteLayout>
      <div className="border-b border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-background">
        <div className="container mx-auto max-w-5xl px-4 pt-8">
          <Link to="/empregos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Todas as vagas
          </Link>
        </div>
      </div>

      <article className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-card p-6 sm:p-8">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                <Sparkles className="h-3 w-3" /> Vaga em destaque
              </span>
              <div className="mt-3 flex items-start gap-4">
                {job.company_logo_url ? (
                  <img src={job.company_logo_url} alt={job.company_name ?? ""} className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{job.title}</h1>
                  {job.company_name && <p className="mt-1 text-lg text-muted-foreground">{job.company_name}</p>}
                </div>
              </div>
              <MetaRow job={job} />
            </div>

            {job.description && (
              <Section title="Sobre a vaga">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{job.description}</p>
              </Section>
            )}
            <BulletsSection title="Responsabilidades" items={job.responsibilities} />
            <BulletsSection title="Requisitos" items={job.requirements} />
            <BulletsSection title="Diferenciais" items={job.nice_to_have} />
            <BulletsSection title="Benefícios" items={job.benefits} />

            {(job.company_size || job.company_culture) && (
              <Section title={`Sobre ${job.company_name ?? "a empresa"}`}>
                {job.company_size && (
                  <p className="text-sm text-muted-foreground"><strong className="text-foreground">Porte:</strong> {job.company_size}</p>
                )}
                {job.company_culture && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{job.company_culture}</p>
                )}
              </Section>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-semibold">Candidatar-se</h3>
              <div className="mt-4 space-y-2">
                {job.apply_url && (
                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full gap-2" size="lg">
                      Candidatar-se agora <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {job.apply_email && (
                  <a href={`mailto:${job.apply_email}?subject=${encodeURIComponent(`Candidatura: ${job.title}`)}`} className="block">
                    <Button variant="outline" className="w-full gap-2">
                      <Mail className="h-4 w-4" /> Enviar por e-mail
                    </Button>
                  </a>
                )}
                {job.apply_whatsapp && (
                  <a
                    href={`https://wa.me/${job.apply_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Gostaria de me candidatar à vaga "${job.title}".`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full gap-2">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                )}
              </div>
              {job.application_deadline && (
                <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Envie sua candidatura até {new Date(job.application_deadline).toLocaleDateString("pt-BR")}
                </p>
              )}
              {job.job_sources && (
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  Fonte: {job.job_sources.name}
                </p>
              )}
            </div>
          </aside>
        </div>
      </article>
    </SiteLayout>
  );
}

function JobHeader({ job }: { job: JobDetail }) {
  return (
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
  );
}

function MetaRow({ job }: { job: JobDetail }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  return (
    <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
      {(job.location_city || job.location_state) && (
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4" /> {[job.location_city, job.location_state].filter(Boolean).join(" · ")}
        </span>
      )}
      {job.employment_type && <span>💼 {job.employment_type}</span>}
      {job.experience_level && <span>📊 {job.experience_level}</span>}
      {job.workload && <span>⏱️ {job.workload}</span>}
      {salary && <span className="font-semibold text-primary">💰 {salary}</span>}
    </div>
  );
}

function ApplyCTA({ job }: { job: JobDetail }) {
  if (!job.apply_url && !job.apply_email && !job.apply_whatsapp) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {job.apply_url && (
        <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="gap-2">Candidatar-se <ExternalLink className="h-4 w-4" /></Button>
        </a>
      )}
      <Link to="/empregos"><Button variant="outline" size="lg">Ver outras vagas</Button></Link>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BulletsSection({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <Section title={title}>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

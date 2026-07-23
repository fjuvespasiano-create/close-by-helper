import { Link } from "@tanstack/react-router";
import { Building2, Check, MapPin, Sparkles, Wifi } from "lucide-react";
import type { PremiumJobRow } from "../types";
import { formatPostedDate, formatSalary } from "../format";

export function PremiumJobCard({ job }: { job: PremiumJobRow }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const topBenefits = (job.benefits ?? []).slice(0, 3);
  return (
    <Link
      to="/empregos/$id"
      params={{ id: job.id }}
      search={{}}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/60 hover:shadow-[0_25px_50px_-12px_rgb(245_158_11/0.25)]"
    >
      <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
        <Sparkles className="h-3 w-3" /> Vaga em destaque
      </span>

      <div className="mt-2 flex items-start gap-3">
        {job.company_logo_url ? (
          <img
            src={job.company_logo_url}
            alt={job.company_name ?? ""}
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-display text-base font-bold group-hover:text-primary">{job.title}</h3>
          {job.company_name && <p className="mt-0.5 text-sm text-muted-foreground">{job.company_name}</p>}
        </div>
        {job.is_remote && (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <Wifi className="mr-0.5 inline h-3 w-3" /> Remoto
          </span>
        )}
      </div>

      {(job.location_city || job.location_state) && !job.is_remote && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {[job.location_city, job.location_state].filter(Boolean).join(" · ")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.employment_type && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
            {job.employment_type}
          </span>
        )}
        {job.experience_level && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {job.experience_level}
          </span>
        )}
        {job.workload && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {job.workload}
          </span>
        )}
      </div>

      {topBenefits.length > 0 && (
        <ul className="mt-3 space-y-1">
          {topBenefits.map((b) => (
            <li key={b} className="flex items-start gap-1.5 text-xs text-foreground/80">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="line-clamp-1">{b}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-xs text-muted-foreground">{formatPostedDate(job.posted_at)}</span>
        {salary && <span className="text-sm font-bold text-primary">{salary}</span>}
      </div>
    </Link>
  );
}

import { Link } from "@tanstack/react-router";
import { Building2, MapPin, Sparkles, Wifi } from "lucide-react";
import type { JobRow } from "../types";
import { formatPostedDate, formatSalary } from "../format";

export function JobCard({ job }: { job: JobRow }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  return (
    <Link
      to="/empregos/$id"
      params={{ id: job.id }}
      search={{}}
      className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_40px_-16px_rgb(15_23_42/0.22)]"
    >
      {job.is_premium && (
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          <Sparkles className="h-3 w-3" /> Premium
        </span>
      )}
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
        <span className="text-xs text-muted-foreground">{formatPostedDate(job.posted_at)}</span>
        {salary && <span className="text-sm font-semibold text-primary">{salary}</span>}
      </div>
    </Link>
  );
}

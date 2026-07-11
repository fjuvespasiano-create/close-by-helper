import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useSelectedCity, CITY_OPTIONS } from "@/hooks/useSelectedCity";
import { fetchAgoraFeed, AGORA_KIND_META } from "@/lib/agora";
import { cn } from "@/lib/utils";

export function AgoraWidget() {
  const { city } = useSelectedCity();
  const cityName = CITY_OPTIONS.find((c) => c.slug === city)?.name ?? city;
  const { data } = useQuery({
    queryKey: ["agora-widget", city],
    queryFn: () => fetchAgoraFeed(city, 6),
    staleTime: 120_000,
    gcTime: 5 * 60_000,
  });

  if (!data || data.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Ao vivo
            </div>
            <h2 className="mt-1 text-xl font-bold md:text-2xl">Agora em {cityName}</h2>
          </div>
          <Link
            to="/agora"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver tudo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {data.slice(0, 6).map((item) => {
            const meta = AGORA_KIND_META[item.kind];
            return (
              <Link
                key={item.id}
                to={item.href}
                className="group flex items-start gap-3 rounded-xl border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
              >
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg", meta.color)}>
                  {meta.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
                    {item.badge && (
                      <span className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        item.urgent ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground",
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">{item.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

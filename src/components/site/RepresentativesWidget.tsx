import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import {
  CITY_NAME,
  fetchActivityFeed,
  KIND_META,
  representativesKeys,
  ROLE_LABEL,
  timeAgo,
} from "@/features/representatives";

const WIDGET_FILTERS = { sinceDays: 14, limit: 3 } as const;

export function RepresentativesWidget() {
  const { city: citySlug } = useSelectedCity();
  const cityName = CITY_NAME[citySlug];

  const { data: items = [], isLoading } = useQuery({
    queryKey: representativesKeys.widget(citySlug),
    queryFn: () => fetchActivityFeed({ citySlug, ...WIDGET_FILTERS }),
  });

  if (!isLoading && items.length === 0) return null;

  return (
    <section className="container my-8">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">O que seus representantes fizeram em {cityName}</h2>
            </div>
            <Link
              to="/representantes/feed"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((a) => {
                const meta = KIND_META[a.kind] ?? KIND_META.outro;
                return (
                  <li key={a.id}>
                    <div className="flex items-start gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/40 transition">
                      <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${meta.color}`}>
                        {meta.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{timeAgo(a.occurred_at)}</span>
                        </div>
                        <div className="text-sm font-medium line-clamp-1">{a.title}</div>
                        {a.representative && (
                          <div className="text-xs text-muted-foreground truncate">
                            {ROLE_LABEL[a.representative.role]} {a.representative.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

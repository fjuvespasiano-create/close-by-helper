import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CitySwitch } from "@/components/site/CitySwitch";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import { useCityId } from "@/hooks/useCityId";
import {
  useLiveFeed,
  LiveFeedItemCard,
  CATEGORY_LABEL,
  type LiveFeedCategory,
} from "@/features/live-feed";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({
    meta: [
      { title: "Acontecendo agora — AgenddaAqui" },
      {
        name: "description",
        content:
          "Feed ao vivo com eventos, vagas, promoções, licitações e ações de vereadores em Vespasiano e São José da Lapa. Atualizações em tempo real.",
      },
      { property: "og:title", content: "Acontecendo agora — AgenddaAqui" },
      {
        property: "og:description",
        content:
          "Tudo que está acontecendo agora em Vespasiano e São José da Lapa, em um só lugar.",
      },
    ],
  }),
  component: LiveFeedPage,
});

const ALL_CATEGORIES: LiveFeedCategory[] = [
  "events",
  "jobs",
  "deals",
  "government",
  "civic",
];

function LiveFeedPage() {
  const { city } = useSelectedCity();
  const { data: cityId } = useCityId(city);
  const [active, setActive] = useState<Set<LiveFeedCategory>>(
    new Set(ALL_CATEGORIES),
  );

  const { items, isLoading, isFetching } = useLiveFeed({
    cityId: cityId ?? null,
    limit: 80,
  });

  const filtered = useMemo(
    () => items.filter((i) => active.has(i.category)),
    [items, active],
  );

  const toggle = (c: LiveFeedCategory) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      if (next.size === 0) return new Set(ALL_CATEGORIES);
      return next;
    });
  };

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-8 sm:py-12">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span aria-hidden className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Ao vivo
              </span>
              {isFetching ? (
                <span className="text-xs text-muted-foreground">atualizando…</span>
              ) : null}
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Acontecendo agora
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Últimas 72h em Vespasiano e São José da Lapa. Atualiza em tempo real.
            </p>
          </div>
          <CitySwitch />
        </header>

        <div
          role="tablist"
          aria-label="Filtrar por categoria"
          className="mb-6 flex flex-wrap gap-2"
        >
          {ALL_CATEGORIES.map((c) => {
            const on = active.has(c);
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => toggle(c)}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  on
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                {CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nada nas últimas 72 horas com esses filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((it) => (
              <LiveFeedItemCard key={it.key} item={it} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

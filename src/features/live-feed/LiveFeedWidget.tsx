import { Link } from "@tanstack/react-router";
import { useLiveFeed } from "./useLiveFeed";
import { LiveFeedItemCard } from "./LiveFeedItemCard";

interface Props {
  cityId?: string | null;
  limit?: number;
  title?: string;
}

export function LiveFeedWidget({ cityId, limit = 5, title = "Acontecendo agora" }: Props) {
  const { items, isLoading } = useLiveFeed({ cityId, limit: 30 });
  const top = items.slice(0, limit);

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="relative flex h-2.5 w-2.5"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            {title}
          </h2>
        </div>
        <Link
          to="/ao-vivo"
          className="text-xs font-medium text-primary hover:underline"
        >
          Ver tudo →
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nada novo nas últimas horas. Volte em instantes.
        </p>
      ) : (
        <div className="space-y-2">
          {top.map((it) => (
            <LiveFeedItemCard key={it.key} item={it} compact />
          ))}
        </div>
      )}
    </section>
  );
}

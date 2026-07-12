import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LiveFeedItem } from "./types";

interface Props {
  item: LiveFeedItem;
  compact?: boolean;
}

export function LiveFeedItemCard({ item, compact }: Props) {
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const inner = (
    <article
      className={`group flex gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40 ${
        compact ? "" : "sm:p-4"
      }`}
    >
      <div
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-lg"
      >
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
            {item.badgeLabel}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
        <h3
          className={`line-clamp-2 font-medium text-foreground ${
            compact ? "text-sm" : "text-base"
          }`}
        >
          {item.title}
        </h3>
        {!compact && item.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        ) : null}
      </div>
    </article>
  );

  if (!item.href) return inner;
  if (item.href.startsWith("http")) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return <Link to={item.href}>{inner}</Link>;
}

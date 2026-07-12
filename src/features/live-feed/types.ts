export type LiveFeedSource =
  | "event"
  | "job"
  | "promotion"
  | "procurement"
  | "activity";

export type LiveFeedCategory =
  | "events"
  | "jobs"
  | "deals"
  | "government"
  | "civic";

export interface LiveFeedItem {
  key: string;
  source: LiveFeedSource;
  sourceId: string;
  category: LiveFeedCategory;
  title: string;
  description?: string | null;
  cityId: string | null;
  createdAt: string;
  href?: string;
  icon: string;
  badgeLabel: string;
}

export const SOURCE_META: Record<
  LiveFeedSource,
  { category: LiveFeedCategory; icon: string; label: string }
> = {
  event: { category: "events", icon: "🎉", label: "Evento" },
  job: { category: "jobs", icon: "💼", label: "Vaga" },
  promotion: { category: "deals", icon: "🏷️", label: "Promoção" },
  procurement: { category: "government", icon: "📄", label: "Licitação" },
  activity: { category: "civic", icon: "🏛️", label: "Vereador" },
};

export const CATEGORY_LABEL: Record<LiveFeedCategory, string> = {
  events: "Eventos",
  jobs: "Empregos",
  deals: "Promoções",
  government: "Governo",
  civic: "Vereadores",
};

export type PlanSlug = "free" | "premium" | "featured";

export type PlanLimits = {
  maxPhotos: number;
  maxProjects: number;
  maxCategories: number;
  maxFaqs: number;
  allowBanner: boolean;
  allowVideo: boolean;
  badgeLabel: string | null;
  showsInHome: boolean;
  cardVariant: "default" | "premium" | "featured";
  autoVerified: boolean;
  premiumBadges: string[];
  prioritySearch: boolean;
  advancedAnalytics: boolean;
  dedicatedSupport: boolean;
};

export const PREMIUM_BADGES = ["Top atendimento", "Especialista", "Entrega garantida"] as const;

export function getPlanLimits(plan?: string | null): PlanLimits {
  const p = (plan ?? "free") as PlanSlug;
  if (p === "featured") {
    return {
      maxPhotos: 999,
      maxProjects: 999,
      maxCategories: 999,
      maxFaqs: 999,
      allowBanner: true,
      allowVideo: true,
      badgeLabel: "⭐ Destaque",
      showsInHome: true,
      cardVariant: "featured",
      autoVerified: true,
      premiumBadges: [...PREMIUM_BADGES],
      prioritySearch: true,
      advancedAnalytics: true,
      dedicatedSupport: true,
    };
  }
  if (p === "premium") {
    return {
      maxPhotos: 999,
      maxProjects: 999,
      maxCategories: 999,
      maxFaqs: 999,
      allowBanner: true,
      allowVideo: false,
      badgeLabel: "Premium",
      showsInHome: true,
      cardVariant: "premium",
      autoVerified: true,
      premiumBadges: [...PREMIUM_BADGES],
      prioritySearch: true,
      advancedAnalytics: true,
      dedicatedSupport: true,
    };
  }
  return {
    maxPhotos: 3,
    maxProjects: 2,
    maxCategories: 2,
    maxFaqs: 3,
    allowBanner: false,
    allowVideo: false,
    badgeLabel: null,
    showsInHome: false,
    cardVariant: "default",
    autoVerified: false,
    premiumBadges: [],
    prioritySearch: false,
    advancedAnalytics: false,
    dedicatedSupport: false,
  };
}

export function isPremium(plan?: string | null): boolean {
  return plan === "premium" || plan === "featured";
}

export function planRank(plan?: string | null): number {
  if (plan === "premium") return 0;
  if (plan === "featured") return 0;
  return 2;
}

export function sortByPlan<T extends { plan?: string | null; featured?: boolean | null; rating?: number; review_count?: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const pa = planRank(a.plan);
    const pb = planRank(b.plan);
    if (pa !== pb) return pa - pb;
    const fa = a.featured ? 0 : 1;
    const fb = b.featured ? 0 : 1;
    if (fa !== fb) return fa - fb;
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    return (b.review_count ?? 0) - (a.review_count ?? 0);
  });
}

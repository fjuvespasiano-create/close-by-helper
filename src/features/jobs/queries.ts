import type { SearchState } from "./types";

export const jobsKeys = {
  all: ["jobs"] as const,
  list: (search: SearchState) => ["jobs", "list", search] as const,
  detail: (id: string) => ["jobs", "detail", id] as const,
  facets: () => ["jobs", "facets"] as const,
  premium: (filters: { city?: string; category?: string; limit?: number }) =>
    ["jobs", "premium", filters] as const,
};

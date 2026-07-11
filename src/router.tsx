import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 60s → avoids refetch storms when navigating
        // between routes that share the same query keys (cities, categories,
        // featured companies, etc.).
        staleTime: 60_000,
        // Keep unused query results warm in memory for 5 minutes so back/forward
        // navigation is instant.
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Prefetch route chunks on hover/focus for snappy SPA transitions.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 30_000,
    // Keep the last page visible while the next one is loading → no white flash.
    defaultPendingMs: 200,
    defaultPendingMinMs: 0,
  });

  return router;
};

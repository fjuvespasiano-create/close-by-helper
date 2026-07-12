import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ClientOnly,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { registerServiceWorker } from "@/lib/pwa";
import { supabase } from "@/integrations/supabase/client";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { PageTransition } from "@/components/site/PageTransition";

const BugReportButton = lazy(() =>
  import("@/components/qa/BugReportButton").then((m) => ({ default: m.BugReportButton })),
);
const RequestFormButton = lazy(() =>
  import("@/components/site/RequestFormButton").then((m) => ({ default: m.RequestFormButton })),
);

const SUPABASE_ORIGIN = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AgenddaAqui — Serviços e empresas perto de você em Vespasiano e SJL" },
      { name: "description", content: "Encontre empresas verificadas, promoções, empregos, eventos e serviços públicos em Vespasiano e São José da Lapa/MG. A cidade inteira no seu bolso." },
      { name: "author", content: "AgenddaAqui" },
      { name: "keywords", content: "Vespasiano, São José da Lapa, empresas locais, serviços, promoções, empregos, eventos, guia comercial, MG" },
      { name: "geo.region", content: "BR-MG" },
      { name: "geo.placename", content: "Vespasiano; São José da Lapa" },
      { property: "og:site_name", content: "AgenddaAqui" },
      { property: "og:title", content: "AgenddaAqui — Serviços e empresas perto de você" },
      { property: "og:description", content: "Guia local de Vespasiano e São José da Lapa: empresas, promoções, empregos, eventos e serviços públicos." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0057FF" },
      { name: "twitter:title", content: "AgenddaAqui — Serviços e empresas perto de você" },
      { name: "twitter:description", content: "Guia local de Vespasiano e São José da Lapa: empresas, promoções, empregos, eventos e serviços públicos." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512.png" },
      ...(SUPABASE_ORIGIN
        ? [
            { rel: "preconnect", href: SUPABASE_ORIGIN, crossOrigin: "anonymous" as const },
            { rel: "dns-prefetch", href: SUPABASE_ORIGIN },
          ]
        : []),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://close-by-helper.lovable.app/#organization",
              name: "AgenddaAqui",
              url: "https://close-by-helper.lovable.app",
              logo: "https://close-by-helper.lovable.app/icons/icon-512.png",
              description: "Guia local de empresas, promoções, empregos, eventos e serviços públicos em Vespasiano e São José da Lapa/MG.",
              areaServed: [
                { "@type": "City", name: "Vespasiano", address: { "@type": "PostalAddress", addressRegion: "MG", addressCountry: "BR" } },
                { "@type": "City", name: "São José da Lapa", address: { "@type": "PostalAddress", addressRegion: "MG", addressCountry: "BR" } },
              ],
              sameAs: [],
            },
            {
              "@type": "WebSite",
              "@id": "https://close-by-helper.lovable.app/#website",
              url: "https://close-by-helper.lovable.app",
              name: "AgenddaAqui",
              inLanguage: "pt-BR",
              publisher: { "@id": "https://close-by-helper.lovable.app/#organization" },
              potentialAction: {
                "@type": "SearchAction",
                target: "https://close-by-helper.lovable.app/buscar?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const w = window as unknown as { requestIdleCallback?: (cb: () => void) => number };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(() => registerServiceWorker())
      : window.setTimeout(() => registerServiceWorker(), 1200);
    return () => {
      const wc = window as unknown as { cancelIdleCallback?: (id: number) => void };
      wc.cancelIdleCallback ? wc.cancelIdleCallback(id) : window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    // Keep router + query cache in sync with auth changes. Filter to identity
    // transitions only — TOKEN_REFRESHED fires ~hourly and would thrash caches.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      // Avoid refetching protected queries against a cleared session on sign-out.
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      else queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <PageTransition>
        <Outlet />
      </PageTransition>
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <BugReportButton />
          <RequestFormButton />
        </Suspense>
      </ClientOnly>
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

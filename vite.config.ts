// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// STATIC_BUILD=1 → build SPA (sem SSR) para hospedagem sem Node (HostGator/Apache).
// Sem a variável, o build normal com SSR continua igual (preview/publish do Lovable).
const isStaticBuild = process.env.STATIC_BUILD === "1";

export default defineConfig({
  tanstackStart: isStaticBuild
    ? {
        // Build estático: sem wrapper de SSR (não há servidor em produção).
        spa: { enabled: true },
        prerender: { enabled: true, crawlLinks: false },
      }
    : {
        // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
        // nitro/vite builds from this
        server: { entry: "server" },
      },
});

import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { BackButton } from "./BackButton";
import { useCityAutoDetect } from "@/hooks/useCityAutoDetect";

// Overlays só aparecem após interação/delay: fora do bundle inicial de toda rota.
const PWAInstallPrompt = lazy(() =>
  import("./PWAInstallPrompt").then((m) => ({ default: m.PWAInstallPrompt })),
);
const AdModal = lazy(() =>
  import("./AdModal").then((m) => ({ default: m.AdModal })),
);
// Tema sazonal depende da data do visitante → só pode montar no cliente.
const SeasonalTheme = lazy(() =>
  import("./SeasonalTheme").then((m) => ({ default: m.SeasonalTheme })),
);



/**
 * Difere o carregamento dos overlays até o browser ficar ocioso
 * (ou 2s após hidratação como fallback). Reduz o JS crítico de todas as rotas.
 */
function DeferredOverlays() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idle = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (typeof idle === "function") {
      const id = idle(() => setReady(true), { timeout: 2500 });
      return () => {
        const cancel = (window as unknown as {
          cancelIdleCallback?: (id: number) => void;
        }).cancelIdleCallback;
        cancel?.(id);
      };
    }
    const t = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return null;
  return (
    <Suspense fallback={null}>
      <PWAInstallPrompt />
      <AdModal />



    </Suspense>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  useCityAutoDetect();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <BackButton />
      <main className="flex-1">{children}</main>
      <Footer />
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <SeasonalTheme />
        </Suspense>
        <DeferredOverlays />
      </ClientOnly>
    </div>
  );
}


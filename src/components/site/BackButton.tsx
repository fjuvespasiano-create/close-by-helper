import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/",
  );
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setPathname(window.location.pathname);
    setCanGoBack(window.history.length > 1);
    const unsub = router.subscribe("onResolved", () => {
      setPathname(window.location.pathname);
      setCanGoBack(window.history.length > 1);
    });
    return () => unsub();
  }, [router]);

  if (pathname === "/") return null;

  function handleClick() {
    if (typeof window !== "undefined" && canGoBack && document.referrer !== window.location.href) {
      window.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  }

  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8", className)}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Voltar para a página anterior"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-x-0.5 hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "asp:ache-servico-popup-v1";

export function AcheServicoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        const t = setTimeout(() => setOpen(true), 500);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const close = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ache-servico-title"
    >
      <button
        type="button"
        aria-label="Fechar"
        onClick={close}
        className="absolute inset-0 bg-foreground/70 backdrop-blur-sm animate-in fade-in duration-300"
      />

      <div className="relative w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-border animate-in fade-in zoom-in-95 duration-300 sm:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <Search className="h-7 w-7" />
        </div>

        <h2
          id="ache-servico-title"
          className="text-3xl font-black tracking-tight text-foreground sm:text-4xl"
        >
          Ache Serviço
        </h2>

        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Encontre rapidamente os melhores prestadores, comércios e serviços
          públicos da sua cidade — tudo num só lugar.
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={close}>
            Agora não
          </Button>
          <Button asChild size="sm" onClick={close}>
            <Link to="/buscar">
              Buscar serviços
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

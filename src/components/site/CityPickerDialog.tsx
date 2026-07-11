import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CITY_OPTIONS, useSelectedCity } from "@/hooks/useSelectedCity";
import { useRunGPSDetect } from "@/hooks/useCityAutoDetect";
import { toast } from "sonner";

export function CityPickerDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { city, setCity } = useSelectedCity();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [detecting, setDetecting] = useState(false);
  const runGPS = useRunGPSDetect();

  const filtered = CITY_OPTIONS.filter((c) =>
    c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function useGPS() {
    setDetecting(true);
    const res = await runGPS();
    setDetecting(false);
    if (res?.slug) {
      toast.success(`Cidade detectada: ${res.name}`);
      setOpen(false);
    } else {
      toast.error("Não foi possível detectar sua cidade");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <MapPin className="h-4 w-4" />
            {CITY_OPTIONS.find((c) => c.slug === city)?.name ?? "Escolher cidade"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolha sua cidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={useGPS}
            disabled={detecting}
          >
            <Navigation className="h-4 w-4" />
            {detecting ? "Detectando…" : "Usar minha localização"}
          </Button>
          <input
            type="text"
            placeholder="Buscar cidade…"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  setCity(c.slug);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                  city === c.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <span>{c.name}</span>
                {city === c.slug ? <span className="text-xs">Selecionada</span> : null}
              </button>
            ))}
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Nenhuma cidade encontrada</div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

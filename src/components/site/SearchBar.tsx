import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchCities } from "@/lib/queries";

export function SearchBar({ defaultQ = "", defaultCity = "todas" }: { defaultQ?: string; defaultCity?: string }) {
  const navigate = useNavigate();
  const [q, setQ] = useState(defaultQ);
  const [city, setCity] = useState(defaultCity);

  // keep state in sync when navigating between /buscar URLs
  useEffect(() => { setQ(defaultQ); }, [defaultQ]);
  useEffect(() => { setCity(defaultCity || "todas"); }, [defaultCity]);

  const cities = useQuery({ queryKey: ["cities"], queryFn: fetchCities, staleTime: 5 * 60_000 });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate({
          to: "/buscar",
          search: {
            q: q.trim() || undefined,
            city: city && city !== "todas" ? city : undefined,
          },
        });
      }}
      className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-[0_20px_50px_-20px_rgb(15_23_42/0.35)] ring-1 ring-black/5 md:flex-row md:items-center md:gap-0 md:rounded-full md:p-1.5"
    >
      <div className="flex flex-1 items-center gap-2 px-4 py-2.5">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="O que você procura? Ex: eletricista, gráfica..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="hidden h-8 w-px bg-border md:block" />
      <div className="flex items-center gap-2 px-4 py-2.5 md:min-w-[220px]">
        <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full cursor-pointer bg-transparent text-sm text-foreground outline-none"
        >
          <option value="todas">Todas as cidades</option>
          {(cities.data ?? []).map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <Button type="submit" size="lg" className="rounded-xl px-6 shadow-md md:rounded-full">
        Buscar
      </Button>
    </form>
  );
}

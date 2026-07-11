import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, MapPin, Package } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCategories,
  formatBRL,
  timeAgo,
  toListing,
  CONDITION_LABEL,
  type Listing,
  type ListingCondition,
} from "@/lib/marketplace";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Compre e venda perto de você | AgendaAqui" },
      { name: "description", content: "Anúncios de produtos e serviços em Vespasiano e São José da Lapa. Compre e venda sem taxas, direto com o vendedor." },
      { property: "og:title", content: "Marketplace local — AgendaAqui" },
      { property: "og:description", content: "Compre e venda perto de você, sem taxas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MarketplacePage,
});

type CityRow = { id: string; name: string; slug: string };

function MarketplacePage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("todas");
  const [cityId, setCityId] = useState<string>("todas");
  const [condition, setCondition] = useState<string>("todas");
  const [sort, setSort] = useState<string>("recentes");

  const cats = useQuery({ queryKey: ["mk", "cats"], queryFn: fetchCategories });
  const cities = useQuery({
    queryKey: ["mk", "cities"],
    queryFn: async (): Promise<CityRow[]> => {
      const { data, error } = await supabase
        .from("cities").select("id,name,slug").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as CityRow[];
    },
  });

  const listings = useQuery({
    queryKey: ["mk", "listings", { q, category, cityId, condition, sort }],
    queryFn: async (): Promise<Listing[]> => {
      let query = supabase
        .from("listings")
        .select("*")
        .eq("status", "ativo")
        .limit(60);
      if (category !== "todas") query = query.eq("category_slug", category);
      if (cityId !== "todas") query = query.eq("city_id", cityId);
      if (condition !== "todas") query = query.eq("condition", condition as ListingCondition);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      if (sort === "preco-asc") query = query.order("price", { ascending: true, nullsFirst: false });
      else if (sort === "preco-desc") query = query.order("price", { ascending: false, nullsFirst: false });
      else query = query.order("created_at", { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(toListing);
    },
  });

  const cityMap = useMemo(() => {
    const m = new Map<string, string>();
    (cities.data ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [cities.data]);

  return (
    <SiteLayout>
      <section className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Package className="h-3.5 w-3.5" /> Marketplace local
            </div>
            <h1 className="font-display text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Compre e venda perto de você
            </h1>
            <p className="mt-3 text-muted-foreground md:text-lg">
              Anúncios de moradores de Vespasiano e São José da Lapa. Sem taxas, direto com o vendedor.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/painel/anuncios/novo">
                <Button size="lg" className="gap-2">
                  <Plus className="h-5 w-5" /> Quero anunciar
                </Button>
              </Link>
              <Link to="/painel/anuncios">
                <Button variant="outline" size="lg">Meus anúncios</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Buscar por título (ex: "sofá", "iPhone", "diarista")'
              className="pl-9"
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {(cats.data ?? []).map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as cidades</SelectItem>
                {(cities.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger><SelectValue placeholder="Condição" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Qualquer condição</SelectItem>
                <SelectItem value="novo">Novo</SelectItem>
                <SelectItem value="seminovo">Seminovo</SelectItem>
                <SelectItem value="usado">Usado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger><SelectValue placeholder="Ordenar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recentes">Mais recentes</SelectItem>
                <SelectItem value="preco-asc">Menor preço</SelectItem>
                <SelectItem value="preco-desc">Maior preço</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        {listings.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (listings.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 font-medium">Nenhum anúncio encontrado.</p>
            <p className="text-sm text-muted-foreground">Ajuste os filtros ou seja o primeiro a anunciar.</p>
            <Link to="/painel/anuncios/novo">
              <Button className="mt-4 gap-2"><Plus className="h-4 w-4" /> Criar anúncio</Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {(listings.data ?? []).length} anúncio(s) encontrado(s)
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {(listings.data ?? []).map((l) => (
                <ListingCard key={l.id} listing={l} cityName={l.city_id ? cityMap.get(l.city_id) ?? null : null} />
              ))}
            </div>
          </>
        )}
      </section>
    </SiteLayout>
  );
}

function ListingCard({ listing, cityName }: { listing: Listing; cityName: string | null }) {
  const cover = listing.images[0];
  return (
    <Link
      to="/marketplace/$slug"
      params={{ slug: listing.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>
        )}
        <Badge className="absolute left-2 top-2 bg-background/90 text-foreground shadow">
          {CONDITION_LABEL[listing.condition]}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="text-lg font-bold text-primary">{formatBRL(listing.price)}</div>
        <h3 className="line-clamp-2 text-sm font-semibold">{listing.title}</h3>
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {[listing.neighborhood, cityName].filter(Boolean).join(", ") || "—"}
            </span>
          </span>
          <span className="shrink-0">{timeAgo(listing.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

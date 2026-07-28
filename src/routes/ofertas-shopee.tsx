import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ShopeeProductCard } from "@/components/site/ShopeeProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchShopeeCategories, fetchShopeeProducts, type ShopeeQuery } from "@/lib/shopeeProducts";
import { Search, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ofertas-shopee")({
  head: () => ({
    meta: [
      { title: "Ofertas Shopee — descontos selecionados | AgenddaAqui" },
      {
        name: "description",
        content:
          "Mais de 10 mil produtos da Shopee com desconto e avaliação real. Selecione categoria, desconto mínimo e compre direto pelo link de afiliado.",
      },
      { property: "og:title", content: "Ofertas Shopee — AgenddaAqui" },
      { property: "og:description", content: "Descontos agressivos em produtos com boa nota, curados para você." },
    ],
  }),
  component: OfertasShopeePage,
});

const PAGE_SIZE = 24;

function OfertasShopeePage() {
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [minDiscount, setMinDiscount] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState<ShopeeQuery["sort"]>("discount");
  const [page, setPage] = useState(1);

  const { data: categories } = useQuery({
    queryKey: ["shopee-cats"],
    queryFn: fetchShopeeCategories,
    staleTime: 30 * 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["shopee-products", { q, category, minDiscount, minRating, sort, page }],
    queryFn: () => fetchShopeeProducts({ q, category, minDiscount, minRating, sort, page, pageSize: PAGE_SIZE }),
    staleTime: 5 * 60_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
  }

  function resetFilters() {
    setQ(""); setQInput(""); setCategory(null); setMinDiscount(0); setMinRating(0); setSort("discount"); setPage(1);
  }

  return (
    <SiteLayout>
      {/* Hero */}
      <section className="border-b bg-gradient-to-br from-orange-500/10 via-background to-background">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-600">
            <ShoppingBag className="h-3.5 w-3.5" /> Parceria Shopee Afiliados
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Ofertas <span className="text-orange-500">selecionadas</span> pra você
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground md:text-lg">
            {total.toLocaleString("pt-BR")} produtos com desconto e avaliação real. Compra e envio pela Shopee — o AgenddaAqui ganha uma pequena comissão de afiliado.
          </p>

          <form onSubmit={applySearch} className="mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="Buscar produto (fone, cozinha, ferramenta...)"
                className="pl-9"
              />
            </div>
            <Button type="submit">Buscar</Button>
          </form>
        </div>
      </section>

      {/* Filtros */}
      <section className="sticky top-14 z-30 border-b bg-background/85 backdrop-blur">
        <div className="container mx-auto flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <select
            value={category ?? ""}
            onChange={(e) => { setCategory(e.target.value || null); setPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="">Todas as categorias</option>
            {(categories ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={minDiscount}
            onChange={(e) => { setMinDiscount(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value={0}>Qualquer desconto</option>
            <option value={10}>≥ 10% off</option>
            <option value={20}>≥ 20% off</option>
            <option value={30}>≥ 30% off</option>
            <option value={50}>≥ 50% off</option>
          </select>

          <select
            value={minRating}
            onChange={(e) => { setMinRating(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value={0}>Qualquer nota</option>
            <option value={4}>≥ 4 ★</option>
            <option value={4.5}>≥ 4.5 ★</option>
          </select>

          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value as ShopeeQuery["sort"]); setPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1.5"
          >
            <option value="discount">Maior desconto</option>
            <option value="rating">Melhor avaliação</option>
            <option value="price_asc">Menor preço</option>
            <option value="price_desc">Maior preço</option>
          </select>

          <Button size="sm" variant="ghost" onClick={resetFilters} className="ml-auto">
            Limpar
          </Button>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto max-w-md rounded-2xl border-2 border-dashed p-10 text-center">
            <div className="text-4xl">🔍</div>
            <h3 className="mt-3 font-semibold">Nenhum produto encontrado</h3>
            <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou limpe a busca.</p>
          </div>
        ) : (
          <>
            <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6", isFetching && "opacity-60")}>
              {items.map((p) => (
                <ShopeeProductCard key={p.id} product={p} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <p className="container mx-auto px-4 pb-10 text-center text-xs text-muted-foreground">
        Os preços e disponibilidade são atualizados pela Shopee e podem variar. Ao clicar, você é redirecionado para a Shopee.
      </p>
    </SiteLayout>
  );
}

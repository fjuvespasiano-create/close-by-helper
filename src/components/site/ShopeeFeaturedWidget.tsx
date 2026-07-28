import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { fetchFeaturedShopee } from "@/lib/shopeeProducts";
import { ShopeeProductCard } from "./ShopeeProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export function ShopeeFeaturedWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["shopee-featured"],
    queryFn: () => fetchFeaturedShopee(12),
    staleTime: 10 * 60_000,
  });

  const items = data ?? [];
  if (!isLoading && items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600">
            <ShoppingBag className="h-3.5 w-3.5" /> Ofertas parceiras · Shopee
          </div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">Ofertas do dia pra você economizar</h2>
          <p className="mt-1 text-muted-foreground">
            Selecionamos produtos com desconto agressivo e avaliação alta — links de afiliado.
          </p>
        </div>
        <Link
          to="/ofertas-shopee"
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver todas <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)
          : items.map((p) => <ShopeeProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

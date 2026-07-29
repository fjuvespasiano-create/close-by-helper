import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShoppingBag, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, type ShopeeProduct } from "@/lib/shopeeProducts";

type Props = {
  /** Categoria opcional para filtrar produtos (busca em título/categoria). */
  hint?: string;
  /** Título discreto do bloco. */
  title?: string;
  /** Legenda curta. */
  subtitle?: string;
  /** Quantidade de produtos (2–4 recomendado). */
  limit?: number;
  className?: string;
};

const COLS =
  "id,itemid,title,image_link,product_link,product_short_link,price,sale_price,discount_percentage,item_rating,global_category1";

async function fetchStripProducts(hint: string | undefined, limit: number): Promise<ShopeeProduct[]> {
  let q = supabase
    .from("shopee_products")
    .select(COLS)
    .eq("is_active", true)
    .order("discount_percentage", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (hint && hint.trim()) {
    q = q.or(`title.ilike.%${hint.trim()}%,global_category1.ilike.%${hint.trim()}%`);
  } else {
    q = q.eq("is_featured", true);
  }

  const { data, error } = await q;
  if (error) return [];
  const items = (data ?? []) as ShopeeProduct[];
  if (items.length >= 2) return items;

  // Fallback: qualquer destaque
  const fb = await supabase
    .from("shopee_products")
    .select(COLS)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("discount_percentage", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (fb.data ?? []) as ShopeeProduct[];
}

export function InlineShopeeStrip({
  hint,
  title = "Sugestões pra você",
  subtitle = "Selecionadas com base neste conteúdo · links de parceiro",
  limit = 3,
  className = "",
}: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["shopee-strip", hint ?? "featured", limit],
    queryFn: () => fetchStripProducts(hint, limit),
    staleTime: 15 * 60_000,
  });

  const items = data ?? [];
  if (!isLoading && items.length === 0) return null;

  return (
    <aside
      className={`my-10 rounded-2xl border border-border/70 bg-muted/30 p-5 ${className}`}
      aria-label="Sugestões de produtos parceiros"
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
            <ShoppingBag className="h-3 w-3" /> Parceiro
          </div>
          <h3 className="font-display text-base font-bold md:text-lg">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Link
          to="/ofertas-shopee"
          className="group inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Mais ofertas <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {isLoading
          ? Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
            ))
          : items.slice(0, limit).map((p) => (
              <a
                key={p.id}
                href={p.product_short_link || p.product_link}
                target="_blank"
                rel="noopener sponsored nofollow"
                className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {p.image_link ? (
                    <img
                      src={p.image_link}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : null}
                  {p.discount_percentage && p.discount_percentage > 0 ? (
                    <span className="absolute left-1.5 top-1.5 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      -{Math.round(p.discount_percentage)}%
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2">
                  <p className="line-clamp-2 text-xs font-medium text-foreground/90">{p.title}</p>
                  <div className="mt-auto flex items-center justify-between text-[11px]">
                    <span className="font-bold text-primary">{formatBRL(p.sale_price ?? p.price)}</span>
                    {p.item_rating ? (
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {p.item_rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </a>
            ))}
      </div>
    </aside>
  );
}

import { Star, Tag } from "lucide-react";
import { formatBRL, type ShopeeProduct } from "@/lib/shopeeProducts";

export function ShopeeProductCard({ product }: { product: ShopeeProduct }) {
  const href = product.product_short_link || product.product_link;
  const hasDiscount = (product.discount_percentage ?? 0) > 0;
  const price = product.sale_price ?? product.price;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener sponsored nofollow"
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-ring"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_link ? (
          <img
            src={product.image_link}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Tag className="h-8 w-8" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
            -{Math.round(product.discount_percentage!)}%
          </span>
        )}
        <span className="absolute right-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
          Shopee
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {product.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            {hasDiscount && product.price ? (
              <div className="text-[11px] text-muted-foreground line-through">{formatBRL(product.price)}</div>
            ) : null}
            <div className="text-base font-bold text-primary">{formatBRL(price)}</div>
          </div>
          {product.item_rating ? (
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {product.item_rating.toFixed(1)}
            </div>
          ) : null}
        </div>
      </div>
    </a>
  );
}

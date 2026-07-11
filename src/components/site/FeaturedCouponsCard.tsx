// Card de cupons em destaque para exibir na home.
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Ticket, Copy, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { fetchActiveCoupons, type Coupon } from "@/lib/promocoes";

function discountLabel(c: Coupon): string {
  if (c.discount_label) return c.discount_label;
  if (c.discount_percent) return `${c.discount_percent}% OFF`;
  return "Oferta";
}

export function FeaturedCouponsCard({ citySlug }: { citySlug?: string | null }) {
  const q = useQuery({
    queryKey: ["home-featured-coupons", citySlug],
    queryFn: () => fetchActiveCoupons({ citySlug: citySlug || undefined }),
    staleTime: 60_000,
  });
  const coupons = (q.data ?? []).slice(0, 4);
  if (q.isLoading || coupons.length === 0) return null;

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Cupom "${code}" copiado!`);
    } catch {
      toast.error("Não foi possível copiar o cupom.");
    }
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
            <Ticket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold leading-tight">Cupons em destaque</h2>
            <p className="text-xs text-muted-foreground">
              Descontos exclusivos {citySlug ? "na sua cidade" : "nas cidades atendidas"}
            </p>
          </div>
        </div>
        <Link
          to="/promocoes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Ver todos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="group flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-accent/50 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-bold text-accent">
                {discountLabel(c)}
              </span>
              {c.is_sponsored && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  Patrocinado
                </span>
              )}
            </div>
            <h3 className="mt-2 line-clamp-2 font-semibold leading-snug">{c.title}</h3>
            {c.companies?.name && (
              <p className="mt-1 text-xs text-muted-foreground">{c.companies.name}</p>
            )}
            <button
              type="button"
              onClick={() => copyCode(c.code)}
              className="mt-3 flex items-center justify-between gap-2 rounded-lg border-2 border-dashed border-accent/50 bg-accent/5 px-3 py-2 text-left transition hover:bg-accent/10"
            >
              <span className="truncate font-mono text-sm font-bold tracking-wide">{c.code}</span>
              <Copy className="h-4 w-4 shrink-0 text-accent" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

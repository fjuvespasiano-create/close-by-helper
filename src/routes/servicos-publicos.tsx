import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Clock, MapPin, Phone, Globe } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { CitySwitch } from "@/components/site/CitySwitch";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import {
  PUBLIC_SERVICE_CATEGORIES,
  categoryLabel,
  fetchPublicServices,
  type PublicServiceCategory,
} from "@/lib/publicServices";

const searchSchema = z.object({
  cat: z.string().optional(),
});

export const Route = createFileRoute("/servicos-publicos")({
  validateSearch: (raw) => searchSchema.parse(raw),
  head: () => ({
    meta: [
      { title: "Serviços Públicos — Vespasiano e São José da Lapa" },
      { name: "description", content: "Hospitais, escolas, delegacias, prefeitura, transporte e serviços públicos das duas cidades." },
      { property: "og:title", content: "Serviços Públicos da Cidade" },
      { property: "og:description", content: "Encontre todos os serviços públicos da sua cidade." },
    ],
  }),
  component: PublicServicesPage,
});

function PublicServicesPage() {
  const { cat } = useSearch({ from: "/servicos-publicos" });
  const { city } = useSelectedCity();
  const selectedCat = (cat ?? null) as PublicServiceCategory | null;

  const q = useQuery({
    queryKey: ["public-services", city, selectedCat],
    queryFn: () => fetchPublicServices({ citySlug: city, category: selectedCat }),
  });

  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold md:text-4xl">Serviços Públicos</h1>
              <p className="mt-1 text-muted-foreground">Hospitais, escolas, secretarias, delegacias e mais.</p>
            </div>
            <CitySwitch />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            to="/servicos-publicos"
            search={{}}
            className={`rounded-full px-3 py-1.5 text-sm font-medium border transition ${
              !selectedCat
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary/40"
            }`}
          >
            Todos
          </Link>
          {PUBLIC_SERVICE_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              to="/servicos-publicos"
              search={{ cat: c.slug }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition ${
                selectedCat === c.slug
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              }`}
            >
              <CategoryIcon name={c.icon} className="h-4 w-4" />
              {c.label}
            </Link>
          ))}
        </div>

        {q.isLoading ? (
          <div className="py-16 text-center text-muted-foreground">Carregando…</div>
        ) : (q.data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold">Nada por aqui ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Os serviços públicos estão sendo cadastrados. Volte em breve.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(q.data ?? []).map((s) => (
              <article key={s.id} className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {categoryLabel(s.category)}
                  </span>
                  {s.is_24h ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                      <Clock className="h-3 w-3" /> 24h
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 font-display text-lg font-bold text-foreground">{s.name}</h3>
                {s.subtype ? <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.subtype}</div> : null}
                {s.description ? (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>
                ) : null}
                <div className="mt-3 space-y-1.5 text-sm">
                  {s.address ? (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {s.address}
                        {s.neighborhood ? ` — ${s.neighborhood}` : ""}
                        {s.cities?.name ? `, ${s.cities.name}` : ""}
                      </span>
                    </div>
                  ) : null}
                  {s.hours ? (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{s.hours}</span>
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-border">
                  {s.phone ? (
                    <a
                      href={`tel:${s.phone.replace(/\D/g, "")}`}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Phone className="h-4 w-4" /> {s.phone}
                    </a>
                  ) : null}
                  {s.whatsapp ? (
                    <a
                      href={`https://wa.me/55${s.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/40"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  {s.website ? (
                    <a
                      href={s.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary/40"
                    >
                      <Globe className="h-4 w-4" /> Site
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

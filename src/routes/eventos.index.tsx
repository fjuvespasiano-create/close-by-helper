import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, MapPin, Search, Ticket } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchEventCategories, fetchPublishedEvents } from "@/lib/events";

export const Route = createFileRoute("/eventos/")({
  head: () => ({
    meta: [
      { title: "Eventos e shows — AgendaAqui" },
      { name: "description", content: "Agenda de eventos, shows e atrações em Vespasiano e São José da Lapa." },
      { property: "og:title", content: "Eventos e shows — AgendaAqui" },
    ],
    links: [{ rel: "canonical", href: "/eventos" }],
  }),
  component: EventsListPage,
});

function fmt(d: string) {
  try { return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch { return d; }
}

function EventsListPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const cats = useQuery({ queryKey: ["event-categories"], queryFn: fetchEventCategories });
  const events = useQuery({ queryKey: ["events", q, cat], queryFn: () => fetchPublishedEvents({ q, categorySlug: cat || undefined }) });

  const grouped = useMemo(() => {
    const rows = events.data ?? [];
    const map = new Map<string, typeof rows>();
    for (const e of rows) {
      const key = new Date(e.start_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, [] as any);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries());
  }, [events.data]);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-10">
          <h1 className="font-display text-3xl font-bold md:text-4xl">Eventos e shows</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Descubra o que está rolando na sua cidade — shows, festivais, teatro e mais.</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar evento…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setCat(null)}
              className={`rounded-full border px-3 py-1.5 text-sm ${!cat ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
            >Todas</button>
            {(cats.data ?? []).map((c) => (
              <button key={c.id}
                onClick={() => setCat(c.slug)}
                className={`rounded-full border px-3 py-1.5 text-sm ${cat === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted"}`}
              >{c.name}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        {events.isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : !grouped.length ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhum evento encontrado. <Link to="/eventos" className="text-primary" onClick={() => { setQ(""); setCat(null); }}>Limpar filtros</Link>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([date, rows]) => (
              <div key={date}>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{date}</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {rows.map((e) => (
                    <Link key={e.id} to="/eventos/$slug" params={{ slug: e.slug }} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                      <div className="aspect-[16/10] overflow-hidden bg-muted">
                        {e.cover_image && <img src={e.cover_image} alt={e.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 p-5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" /> {fmt(e.start_at)}
                          {e.event_type && <span className="rounded-full bg-muted px-2 py-0.5">{e.event_type}</span>}
                        </div>
                        <h3 className="font-display text-lg font-bold leading-tight">{e.title}</h3>
                        {e.location && <div className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {e.location}</div>}
                        {e.description && <p className="line-clamp-2 text-sm text-muted-foreground">{e.description}</p>}
                        {(e.price_min ?? e.ticket_url) && (
                          <div className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium text-primary">
                            <Ticket className="h-4 w-4" />
                            {e.price_min != null ? `A partir de R$ ${e.price_min}` : "Ingressos"}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

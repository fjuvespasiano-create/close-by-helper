import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ExternalLink, MapPin, Ticket } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { fetchEventBySlug, fetchShowsForEvent } from "@/lib/events";

export const Route = createFileRoute("/eventos/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — Evento — AgendaAqui` },
      { property: "og:type", content: "event" },
    ],
    links: [{ rel: "canonical", href: `/eventos/${params.slug}` }],
  }),
  component: EventDetailPage,
});

function fmt(d: string) { return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }); }

function EventDetailPage() {
  const { slug } = Route.useParams();
  const q = useQuery({ queryKey: ["event", slug], queryFn: () => fetchEventBySlug(slug) });
  if (q.isSuccess && !q.data) throw notFound();
  const e = q.data;
  const shows = useQuery({ queryKey: ["event-shows", e?.id], queryFn: () => fetchShowsForEvent(e!.id), enabled: !!e?.id });

  return (
    <SiteLayout>
      <article className="container mx-auto max-w-4xl px-4 py-8">
        <Link to="/eventos" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Voltar aos eventos
        </Link>
        {!e ? (
          <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
        ) : (
          <>
            {e.cover_image && <img src={e.cover_image} alt={e.title} className="mt-6 aspect-[16/9] w-full rounded-xl object-cover" />}
            <header className="mt-6">
              {e.event_type && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{e.event_type}</span>}
              <h1 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">{e.title}</h1>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {fmt(e.start_at)}{e.end_at ? ` – ${fmt(e.end_at)}` : ""}</span>
                {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {e.location}</span>}
                {e.price_min != null && <span className="inline-flex items-center gap-1"><Ticket className="h-4 w-4" /> A partir de R$ {e.price_min}</span>}
              </div>
              {e.ticket_url && (
                <a href={e.ticket_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex">
                  <Button className="gap-2"><Ticket className="h-4 w-4" /> Comprar ingressos <ExternalLink className="h-3.5 w-3.5" /></Button>
                </a>
              )}
            </header>
            {e.description && <p className="mt-6 whitespace-pre-line leading-relaxed text-foreground/90">{e.description}</p>}

            <section className="mt-10">
              <h2 className="font-display text-2xl font-bold">Programação</h2>
              {shows.isLoading ? (
                <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" />
              ) : !shows.data?.length ? (
                <p className="mt-3 text-muted-foreground">Ainda não há atrações cadastradas.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {shows.data.map((s) => (
                    <li key={s.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center">
                      {s.cover_image && <img src={s.cover_image} alt={s.artist_name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="font-semibold">{s.artist_name}</h3>
                          {s.stage && <span className="text-xs text-muted-foreground">· {s.stage}</span>}
                        </div>
                        <div className="text-sm text-muted-foreground">{fmt(s.start_at)}{s.end_at ? ` – ${new Date(s.end_at).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}` : ""}</div>
                        {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
                      </div>
                      {s.ticket_url && (
                        <a href={s.ticket_url} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="gap-1"><Ticket className="h-4 w-4" /> Ingresso</Button>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </article>
    </SiteLayout>
  );
}

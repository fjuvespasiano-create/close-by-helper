import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSelectedCity } from "@/hooks/useSelectedCity";
import { fetchRepresentatives, ROLE_LABEL, type Representative } from "@/lib/representatives";
import { WhatsAppSubscribeDialog } from "@/components/site/WhatsAppSubscribeDialog";
import { Users, Building2, Radio, MessageCircle, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/representantes/")({
  component: RepresentativesListPage,
});

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function RepresentativesListPage() {
  const { city: citySlug } = useSelectedCity();
  const [role, setRole] = useState<"all" | Representative["role"]>("all");
  const [party, setParty] = useState<string>("all");
  const [subscribeOpen, setSubscribeOpen] = useState(false);

  const { data: reps = [], isLoading } = useQuery({
    queryKey: ["representatives", citySlug],
    queryFn: () => fetchRepresentatives(citySlug),
  });

  const parties = Array.from(new Set(reps.map((r) => r.party).filter((p): p is string => !!p))).sort();
  const filtered = reps.filter(
    (r) => (role === "all" || r.role === role) && (party === "all" || r.party === party),
  );

  const cityName = citySlug === "vespasiano" ? "Vespasiano" : "São José da Lapa";

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="border-b bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container py-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Building2 className="h-3.5 w-3.5" />
            Transparência pública · {cityName}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            O que seus representantes estão fazendo agora?
          </h1>
          <p className="text-muted-foreground max-w-2xl mb-6">
            Projetos de lei, decretos, obras e votos dos vereadores e prefeitos de {cityName} — sem juridiquês, sem
            portal complicado.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/representantes/feed">
                <Radio className="mr-2 h-4 w-4" /> Ver feed ao vivo
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/representantes/ranking">Ranking do mês</Link>
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setSubscribeOpen(true)}>
              <MessageCircle className="mr-2 h-4 w-4" /> Resumo semanal no WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* FILTROS + LISTA */}
      <section className="container py-8">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4" /> {filtered.length} {filtered.length === 1 ? "representante" : "representantes"}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                <SelectItem value="prefeito">Prefeito</SelectItem>
                <SelectItem value="vice_prefeito">Vice-Prefeito</SelectItem>
                <SelectItem value="vereador">Vereador</SelectItem>
              </SelectContent>
            </Select>
            {parties.length > 0 && (
              <Select value={party} onValueChange={setParty}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Partido" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os partidos</SelectItem>
                  {parties.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl border bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border p-10 text-center text-muted-foreground">
            Ainda não temos representantes cadastrados para esta cidade com os filtros selecionados.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Link key={r.id} to="/representantes/$id" params={{ id: r.slug }}>
                <Card className="h-full transition hover:shadow-md hover:-translate-y-0.5">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      {r.photo_url ? (
                        <img
                          src={r.photo_url}
                          alt={r.name}
                          className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/10"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                          {initials(r.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{ROLE_LABEL[r.role]}</div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.party && <Badge variant="secondary" className="text-[10px]">{r.party}</Badge>}
                          <Badge variant="outline" className="text-[10px]">{cityName}</Badge>
                        </div>
                      </div>
                    </div>
                    {r.bio && (
                      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{r.bio}</p>
                    )}
                    <div className="flex items-center justify-end text-xs text-primary mt-3">
                      Ver perfil <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <WhatsAppSubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} defaultCity={citySlug} />
    </SiteLayout>
  );
}

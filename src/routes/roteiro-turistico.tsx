import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Mountain,
  UtensilsCrossed,
  Landmark,
  TreePine,
  Zap,
  Users,
  CalendarDays,
  MapPin,
  Sun,
  Sunrise,
  Sunset,
  Info,
  ArrowLeft,
  Compass,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InlineShopeeStrip } from "@/components/site/InlineShopeeStrip";
import { supabase } from "@/integrations/supabase/client";
import { cavernaImg, gastronomiaImg, ecoturismoImg } from "@/lib/roteiro-images";

export const Route = createFileRoute("/roteiro-turistico")({
  head: () => ({
    meta: [
      {
        title:
          "O que fazer em Vespasiano e São José da Lapa — Roteiro Turístico",
      },
      {
        name: "description",
        content:
          "Roteiro completo de 2 dias em Vespasiano e São José da Lapa: cavernas, gastronomia mineira, história, ecoturismo e aventura a minutos do Aeroporto de Confins.",
      },
      {
        property: "og:title",
        content:
          "Vespasiano e São José da Lapa: Aventura, Cultura e Sabores Mineiros",
      },
      {
        property: "og:description",
        content:
          "Descubra um destino encantador a poucos minutos de Confins: cavernas, comida mineira, história e ecoturismo.",
      },
      { property: "og:image", content: ecoturismoImg },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoteiroTuristicoPage,
});

interface Attraction {
  id: string;
  title: string;
  description: string;
  category: string;
  image_url: string | null;
  link_url: string | null;
  meta: string | null;
  tag: string | null;
  sort_order: number;
}

async function fetchAttractions(): Promise<Attraction[]> {
  const { data, error } = await supabase
    .from("tourist_attractions")
    .select("id,title,description,category,image_url,link_url,meta,tag,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Attraction[];
}

const categoriaIcones: Record<string, typeof Mountain> = {
  aventura: Zap,
  familia: Users,
  gastronomia: UtensilsCrossed,
  historia: Landmark,
  eventos: CalendarDays,
  natureza: TreePine,
  geral: Compass,
};

const categorias = [
  { key: "aventura", icon: Zap, label: "Adrenalina e Esporte", color: "from-red-500/20 to-orange-500/20" },
  { key: "familia", icon: Users, label: "Família e Lazer", color: "from-blue-500/20 to-cyan-500/20" },
  { key: "gastronomia", icon: UtensilsCrossed, label: "Roteiro Gastronômico", color: "from-amber-500/20 to-yellow-500/20" },
  { key: "historia", icon: Landmark, label: "História e Cultura", color: "from-purple-500/20 to-pink-500/20" },
  { key: "eventos", icon: CalendarDays, label: "Eventos Locais", color: "from-emerald-500/20 to-teal-500/20" },
];

const destaquesEstaticos = [
  {
    icon: Mountain,
    titulo: "Exploração de Cavernas",
    descricao: "Visite formações rochosas únicas e deslumbrantes que dão nome a São José da Lapa.",
    imagem: cavernaImg,
  },
  {
    icon: UtensilsCrossed,
    titulo: "Gastronomia Mineira Raiz",
    descricao: "Saboreie pratos tradicionais em restaurantes acolhedores, com tempero de fogão a lenha.",
    imagem: gastronomiaImg,
  },
  {
    icon: TreePine,
    titulo: "Ecoturismo e Natureza",
    descricao: "Trilhas, cachoeiras e paisagens preservadas do carste mineiro em plena Serra do Cipó.",
    imagem: ecoturismoImg,
  },
];

const dia1 = [
  { icon: Sunrise, periodo: "Manhã", atividade: "Visita a uma das cavernas de São José da Lapa." },
  { icon: Sun, periodo: "Almoço", atividade: "Experiência gastronômica com culinária mineira em Vespasiano." },
  { icon: Sun, periodo: "Tarde", atividade: "Passeio pelo centro histórico de Vespasiano e ponto cultural." },
  { icon: Sunset, periodo: "Fim de Tarde", atividade: "Atividade de ecoturismo em área de preservação." },
];

const dia2 = [
  { icon: Sunrise, periodo: "Manhã", atividade: "Atividade esportiva ou de aventura (trilha, rapel, etc.)." },
  { icon: Sun, periodo: "Almoço", atividade: "Degustação de produtos locais ou restaurante com vista panorâmica." },
  { icon: Sunset, periodo: "Tarde", atividade: "Compras de artesanato ou revisita a um local preferido." },
];

const observacoes = [
  "Verifique horários de funcionamento e necessidade de agendamento prévio nas atrações.",
  "Considere a época do ano para atividades ao ar livre — evite períodos de chuva forte.",
  "Consulte a página Agora e Eventos para descobrir programações que coincidam com a visita.",
];

function RoteiroTuristicoPage() {
  const { data: attractions = [] } = useQuery({
    queryKey: ["tourist-attractions"],
    queryFn: fetchAttractions,
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero com imagem real */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10">
          <img
            src={ecoturismoImg}
            alt="Serra do Cipó e paisagem natural de Minas Gerais"
            className="h-full w-full object-cover"
            width={1600}
            height={900}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
          <Badge variant="secondary" className="mb-4 backdrop-blur">
            <Compass className="mr-1 h-3 w-3" />
            Roteiro turístico
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Vespasiano e São José da Lapa
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Aventura, cultura e sabores mineiros
            </span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-foreground/80 md:text-xl">
            Descubra um destino encantador a poucos minutos do Aeroporto de
            Confins, combinando cavernas impressionantes, autêntica comida
            mineira, rica história e ecoturismo. Ideal para um fim de semana
            relaxante ou um bate-volta inesquecível.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Região Metropolitana de BH
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> Roteiro de 2 dias
            </span>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <h2 className="text-2xl font-bold md:text-3xl">Categorias de interesse</h2>
        <p className="mt-2 text-muted-foreground">
          Escolha o clima da viagem e monte o roteiro do seu jeito.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {categorias.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className={cn(
                  "group flex flex-col items-center gap-2 rounded-xl border bg-gradient-to-br p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
                  c.color,
                )}
              >
                <div className="rounded-full bg-background/80 p-2.5 shadow-sm">
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-sm font-medium leading-tight">{c.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Destaques com imagens reais */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold md:text-3xl">Destaques da região</h2>
          <p className="mt-2 text-muted-foreground">
            O que a região tem de mais icônico para você viver.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {destaquesEstaticos.map((d) => {
              const Icon = d.icon;
              return (
                <Card key={d.titulo} className="overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={d.imagem}
                      alt={d.titulo}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                      width={1600}
                      height={900}
                    />
                    <div className="absolute left-3 top-3 rounded-lg bg-background/90 p-2 shadow backdrop-blur">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{d.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{d.descricao}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Atrações cadastradas (dinâmicas) */}
      {attractions.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold md:text-3xl">Atrações cadastradas</h2>
          <p className="mt-2 text-muted-foreground">
            Lugares recomendados por quem conhece a região.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {attractions.map((a) => {
              const Icon = categoriaIcones[a.category] ?? Compass;
              return (
                <Card key={a.id} className="overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  {a.image_url && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={a.image_url}
                        alt={a.title}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      {a.tag && <Badge variant="secondary">{a.tag}</Badge>}
                    </div>
                    <CardTitle className="mt-2 text-lg">{a.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{a.description}</p>
                    {a.meta && (
                      <p className="text-xs text-muted-foreground">📍 {a.meta}</p>
                    )}
                    {a.link_url && (
                      <a
                        href={a.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Saber mais <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* Roteiro 2 dias */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <h2 className="text-2xl font-bold md:text-3xl">Sugestão de roteiro</h2>
        <p className="mt-2 text-muted-foreground">
          Um itinerário equilibrado para aproveitar cada momento da viagem.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {[
            { titulo: "Dia 1", subtitulo: "Cavernas, sabores e história", blocos: dia1 },
            { titulo: "Dia 2", subtitulo: "Aventura e experiências locais", blocos: dia2 },
          ].map((dia) => (
            <Card key={dia.titulo} className="overflow-hidden">
              <CardHeader className="border-b bg-gradient-to-br from-primary/10 to-accent/10">
                <Badge variant="outline" className="w-fit border-primary/40 text-primary">
                  {dia.titulo}
                </Badge>
                <CardTitle className="text-xl">{dia.subtitulo}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ol className="divide-y">
                  {dia.blocos.map((b, i) => {
                    const Icon = b.icon;
                    return (
                      <li key={i} className="flex gap-4 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{b.periodo}</p>
                          <p className="text-sm text-muted-foreground">{b.atividade}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Observações */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold md:text-3xl">Observações importantes</h2>
          </div>
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {observacoes.map((obs, i) => (
              <li
                key={i}
                className="rounded-lg border bg-background p-4 text-sm text-muted-foreground"
              >
                {obs}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/agora">Ver o que está acontecendo agora</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/transporte">Como chegar de ônibus</Link>
            </Button>
          </div>

          <InlineShopeeStrip
            hint="camping"
            title="Kit essencial pra sua aventura"
            subtitle="Mochila, lanterna e mais · links de parceiro"
          />
        </div>
      </section>
    </div>
  );
}

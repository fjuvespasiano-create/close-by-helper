import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
          "Descubra um destino encantador a poucos minutos de Confins: cavernas, comida mineira, história e ecoturismo. Ideal para fim de semana ou bate-volta.",
      },
    ],
  }),
  component: RoteiroTuristicoPage,
});

interface Categoria {
  icon: typeof Mountain;
  label: string;
  color: string;
}

const categorias: Categoria[] = [
  { icon: Zap, label: "Adrenalina e Esporte", color: "from-red-500/20 to-orange-500/20" },
  { icon: Users, label: "Família e Lazer", color: "from-blue-500/20 to-cyan-500/20" },
  { icon: UtensilsCrossed, label: "Roteiro Gastronômico", color: "from-amber-500/20 to-yellow-500/20" },
  { icon: Landmark, label: "História e Cultura", color: "from-purple-500/20 to-pink-500/20" },
  { icon: CalendarDays, label: "Eventos Locais", color: "from-emerald-500/20 to-teal-500/20" },
];

interface Atracao {
  icon: typeof Mountain;
  titulo: string;
  descricao: string;
}

const atracoes: Atracao[] = [
  {
    icon: Mountain,
    titulo: "Exploração de Cavernas",
    descricao:
      "Visite formações rochosas únicas e deslumbrantes que dão nome a São José da Lapa.",
  },
  {
    icon: UtensilsCrossed,
    titulo: "Gastronomia Mineira Raiz",
    descricao:
      "Saboreie pratos tradicionais em restaurantes acolhedores, com tempero de fogão a lenha.",
  },
  {
    icon: Landmark,
    titulo: "Imersão Histórica",
    descricao:
      "Conheça o patrimônio, igrejas centenárias e as histórias que formaram a região.",
  },
  {
    icon: TreePine,
    titulo: "Ecoturismo e Natureza",
    descricao:
      "Desfrute de trilhas, cachoeiras e paisagens naturais preservadas do carste mineiro.",
  },
  {
    icon: Zap,
    titulo: "Atividades de Aventura",
    descricao:
      "Rapel, tirolesa e trilhas para os amantes de adrenalina e esportes ao ar livre.",
  },
  {
    icon: Users,
    titulo: "Lazer em Família",
    descricao:
      "Praças, parques e opções de diversão pensadas para todas as idades.",
  },
];

interface Bloco {
  icon: typeof Sunrise;
  periodo: string;
  atividade: string;
}

const dia1: Bloco[] = [
  { icon: Sunrise, periodo: "Manhã", atividade: "Visita a uma das cavernas de São José da Lapa." },
  { icon: Sun, periodo: "Almoço", atividade: "Experiência gastronômica com culinária mineira em Vespasiano." },
  { icon: Sun, periodo: "Tarde", atividade: "Passeio pelo centro histórico de Vespasiano e ponto cultural." },
  { icon: Sunset, periodo: "Fim de Tarde", atividade: "Atividade de ecoturismo em área de preservação." },
];

const dia2: Bloco[] = [
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
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute inset-0 -z-10 opacity-40">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
          <Badge variant="secondary" className="mb-4">
            <Compass className="mr-1 h-3 w-3" />
            Roteiro turístico
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Vespasiano e São José da Lapa
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Aventura, cultura e sabores mineiros
            </span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
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

      {/* Atrações */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">
          <h2 className="text-2xl font-bold md:text-3xl">
            Atrações e atividades sugeridas
          </h2>
          <p className="mt-2 text-muted-foreground">
            Uma seleção do que a região tem de melhor para oferecer.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {atracoes.map((a) => {
              const Icon = a.icon;
              return (
                <Card key={a.titulo} className="transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="mt-3 text-lg">{a.titulo}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{a.descricao}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Roteiro */}
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
              <CardHeader className="bg-gradient-to-br from-primary/10 to-accent/10 border-b">
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
        </div>
      </section>
    </div>
  );
}

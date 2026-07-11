import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type Props = {
  emoji: string;
  title: string;
  description: string;
};

export function ComingSoon({ emoji, title, description }: Props) {
  return (
    <main className="container mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 text-6xl" aria-hidden>{emoji}</div>
      <h1 className="mb-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="mb-8 text-base text-muted-foreground sm:text-lg">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button variant="outline">Voltar ao início</Button>
        </Link>
        <Link to="/planos">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            Quero anunciar
          </Button>
        </Link>
      </div>
      <p className="mt-8 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        Em breve · AgendaAqui
      </p>
    </main>
  );
}

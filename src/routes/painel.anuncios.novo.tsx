import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useCurrentUserId } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
import { ListingForm } from "@/components/panel/ListingForm";

export const Route = createFileRoute("/painel/anuncios/novo")({
  head: () => ({ meta: [{ title: "Novo anúncio — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: Novo,
});

function Novo() {
  const userId = useCurrentUserId();
  if (!userId) return <p className="text-sm text-muted-foreground">Entre para criar um anúncio.</p>;
  return (
    <div>
      <Link to="/painel/anuncios" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Meus anúncios
      </Link>
      <h1 className="mb-6 font-display text-2xl font-bold">Novo anúncio</h1>
      <ListingForm />
      <div className="mt-8">
        <Link to="/marketplace"><Button variant="ghost" size="sm">← Voltar ao Marketplace</Button></Link>
      </div>
    </div>
  );
}

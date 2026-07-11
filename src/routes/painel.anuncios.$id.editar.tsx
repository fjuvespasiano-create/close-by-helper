import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useCurrentUserId } from "@/lib/favorites";
import { ListingForm, fetchOwnListing } from "@/components/panel/ListingForm";

export const Route = createFileRoute("/painel/anuncios/$id/editar")({
  head: () => ({ meta: [{ title: "Editar anúncio — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: Editar,
});

function Editar() {
  const { id } = Route.useParams();
  const userId = useCurrentUserId();
  const q = useQuery({
    queryKey: ["mk", "own", id],
    enabled: !!userId,
    queryFn: () => fetchOwnListing(id),
  });

  if (!userId) return <p className="text-sm text-muted-foreground">Entre para editar.</p>;
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!q.data) return <p className="text-sm text-muted-foreground">Anúncio não encontrado.</p>;

  const l = q.data;
  return (
    <div>
      <Link to="/painel/anuncios" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Meus anúncios
      </Link>
      <h1 className="mb-6 font-display text-2xl font-bold">Editar anúncio</h1>
      <ListingForm
        existingId={id}
        initial={{
          title: l.title,
          description: l.description ?? "",
          price: l.price !== null ? String(l.price) : "",
          condition: l.condition,
          category_slug: l.category_slug,
          city_id: l.city_id ?? "",
          neighborhood: l.neighborhood ?? "",
          contact_phone: l.contact_phone ?? "",
          images: l.images,
        }}
      />
    </div>
  );
}

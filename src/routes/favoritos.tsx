import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CompanyCard } from "@/components/site/CompanyCard";
import { Button } from "@/components/ui/button";
import { useFavorites, useCurrentUserId, useAuthReady } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/favoritos")({
  head: () => ({
    meta: [
      { title: "Meus favoritos — AgendaAqui" },
      { name: "description", content: "Empresas e profissionais que você salvou no AgendaAqui." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const userId = useCurrentUserId();
  const authReady = useAuthReady();
  const fav = useFavorites();
  const qc = useQueryClient();

  if (!authReady) {
    return (
      <SiteLayout>
        <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Carregando…</div>
      </SiteLayout>
    );
  }

  if (userId === null) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-md px-4 py-20 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Entre para ver seus favoritos</h1>
          <p className="mt-2 text-sm text-muted-foreground">Salve empresas e acesse rapidamente quando precisar.</p>
          <Link to="/auth"><Button className="mt-6">Entrar ou criar conta</Button></Link>
        </div>
      </SiteLayout>
    );
  }

  const items = fav.data ?? [];

  async function clearAll() {
    if (!userId) return;
    if (!confirm("Remover todos os favoritos?")) return;
    const { error } = await supabase.from("favorites").delete().eq("user_id", userId);
    if (error) toast.error("Erro ao limpar");
    else {
      toast.success("Favoritos limpos");
      qc.invalidateQueries({ queryKey: ["favorites", userId] });
    }
  }

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Meus favoritos</h1>
            <p className="mt-1 text-sm text-muted-foreground">{items.length} empresa(s) salva(s)</p>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" onClick={clearAll}>
              <Trash2 className="mr-2 h-4 w-4" /> Limpar tudo
            </Button>
          )}
        </div>

        {fav.isLoading ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-lg font-semibold">Nenhum favorito ainda</p>
            <p className="mt-1 text-sm text-muted-foreground">Toque no coração nos cards para salvar empresas aqui.</p>
            <Link to="/buscar"><Button className="mt-5">Explorar empresas</Button></Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((f) => {
              const c = f.companies as {
                id: string; slug: string; name: string; tagline: string | null;
                banner_url: string | null; logo_url: string | null; plan: string | null;
                featured: boolean | null; cities: { name: string; slug: string } | null;
              } | null;
              if (!c) return null;
              return (
                <CompanyCard
                  key={c.id}
                  company={{
                    id: c.id, slug: c.slug, name: c.name, tagline: c.tagline,
                    banner_url: c.banner_url, logo_url: c.logo_url, plan: c.plan, featured: c.featured,
                    city_name: c.cities?.name,
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CompanyCard } from "@/components/site/CompanyCard";
import { Button } from "@/components/ui/button";
import { useFavorites, useCurrentUserId } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/painel/favoritos")({
  component: PanelFavoritos,
});

function PanelFavoritos() {
  const userId = useCurrentUserId();
  const fav = useFavorites();
  const qc = useQueryClient();
  const items = fav.data ?? [];

  async function clearAll() {
    if (!userId || !confirm("Remover todos os favoritos?")) return;
    const { error } = await supabase.from("favorites").delete().eq("user_id", userId);
    if (error) toast.error("Erro ao limpar");
    else { toast.success("Favoritos limpos"); qc.invalidateQueries({ queryKey: ["favorites", userId] }); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Meus favoritos</h1>
          <p className="text-sm text-muted-foreground">{items.length} empresa(s) salva(s)</p>
        </div>
        {items.length > 0 ? <Button variant="ghost" onClick={clearAll}><Trash2 className="mr-2 h-4 w-4" /> Limpar tudo</Button> : null}
      </div>
      {fav.isLoading ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhum favorito ainda.</p>
          <Link to="/buscar"><Button className="mt-4">Explorar empresas</Button></Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((f) => <CompanyCard key={f.companies.id} company={f.companies} />)}
        </div>
      )}
    </div>
  );
}

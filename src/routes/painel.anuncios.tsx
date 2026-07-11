import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, CheckCircle2, PauseCircle, PlayCircle, Trash2, Eye, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/lib/favorites";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatBRL, timeAgo, toListing, STATUS_LABEL, type Listing, type ListingStatus } from "@/lib/marketplace";

export const Route = createFileRoute("/painel/anuncios")({
  head: () => ({ meta: [{ title: "Meus anúncios — AgendaAqui" }, { name: "robots", content: "noindex" }] }),
  component: PainelAnuncios,
});

function PainelAnuncios() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["mk", "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Listing[]> => {
      const { data, error } = await supabase
        .from("listings").select("*").eq("user_id", userId!).neq("status", "removido")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toListing);
    },
  });

  async function updateStatus(id: string, status: ListingStatus) {
    const { error } = await supabase.from("listings").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Anúncio atualizado.");
    qc.invalidateQueries({ queryKey: ["mk", "mine"] });
  }

  async function remove(id: string) {
    if (!confirm("Excluir este anúncio? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Anúncio excluído.");
    qc.invalidateQueries({ queryKey: ["mk", "mine"] });
  }

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Entre para gerenciar seus anúncios.</p>;
  }

  const items = q.data ?? [];
  const byStatus = (s: ListingStatus) => items.filter((l) => l.status === s);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Meus anúncios</h1>
          <p className="text-sm text-muted-foreground">{items.length} anúncio(s)</p>
        </div>
        <Link to="/painel/anuncios/novo">
          <Button className="gap-2"><Plus className="h-4 w-4" /> Novo anúncio</Button>
        </Link>
      </div>

      <Tabs defaultValue="ativo">
        <TabsList>
          <TabsTrigger value="ativo">Ativos ({byStatus("ativo").length})</TabsTrigger>
          <TabsTrigger value="vendido">Vendidos ({byStatus("vendido").length})</TabsTrigger>
          <TabsTrigger value="pausado">Pausados ({byStatus("pausado").length})</TabsTrigger>
        </TabsList>
        {(["ativo", "vendido", "pausado"] as ListingStatus[]).map((st) => (
          <TabsContent key={st} value={st} className="mt-4">
            {q.isLoading ? (
              <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
              ))}</div>
            ) : byStatus(st).length === 0 ? (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Nenhum anúncio {STATUS_LABEL[st].toLowerCase()}.
              </p>
            ) : (
              <div className="grid gap-3">
                {byStatus(st).map((l) => (
                  <Row key={l.id} l={l} onStatus={updateStatus} onDelete={remove} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function Row({ l, onStatus, onDelete }: {
  l: Listing;
  onStatus: (id: string, s: ListingStatus) => void;
  onDelete: (id: string) => void;
}) {
  const cover = l.images[0];
  return (
    <div className="grid grid-cols-[64px_1fr] gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[80px_1fr_auto]">
      <div className="h-16 w-16 overflow-hidden rounded bg-muted sm:h-20 sm:w-20">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : (
          <div className="grid h-full w-full place-items-center text-muted-foreground"><ImageOff className="h-6 w-6" /></div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{STATUS_LABEL[l.status]}</Badge>
          <span className="text-xs text-muted-foreground">{timeAgo(l.created_at)}</span>
        </div>
        <p className="mt-1 line-clamp-1 font-semibold">{l.title}</p>
        <p className="text-sm font-bold text-primary">{formatBRL(l.price)}</p>
      </div>
      <div className="col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:flex-nowrap">
        <Link to="/marketplace/$slug" params={{ slug: l.slug }}>
          <Button variant="ghost" size="sm" className="gap-1"><Eye className="h-4 w-4" /> Ver</Button>
        </Link>
        <Link to="/painel/anuncios/$id/editar" params={{ id: l.id }}>
          <Button variant="ghost" size="sm" className="gap-1"><Edit className="h-4 w-4" /> Editar</Button>
        </Link>
        {l.status === "ativo" ? (
          <>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => onStatus(l.id, "vendido")}>
              <CheckCircle2 className="h-4 w-4" /> Vendido
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => onStatus(l.id, "pausado")}>
              <PauseCircle className="h-4 w-4" /> Pausar
            </Button>
          </>
        ) : l.status === "pausado" ? (
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => onStatus(l.id, "ativo")}>
            <PlayCircle className="h-4 w-4" /> Reativar
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" className="gap-1 text-destructive hover:text-destructive"
          onClick={() => onDelete(l.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

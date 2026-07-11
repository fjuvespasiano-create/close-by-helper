import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { listMyCompanies, deleteMyCompany } from "@/lib/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ExternalLink, Trash2, Pencil } from "lucide-react";

export const Route = createFileRoute("/painel/empresas")({
  component: PanelEmpresas,
});

function PanelEmpresas() {
  const { userId } = useAdmin();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["panel-companies", userId], queryFn: () => listMyCompanies(userId!), enabled: !!userId });

  async function remove(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta ação é permanente.`)) return;
    try {
      await deleteMyCompany(id);
      toast.success("Empresa excluída");
      qc.invalidateQueries({ queryKey: ["panel-companies"] });
      qc.invalidateQueries({ queryKey: ["panel-stats"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const items = list.data ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Minhas empresas</h1>
          <p className="text-sm text-muted-foreground">{items.length} empresa(s) cadastrada(s)</p>
        </div>
        <Link to="/painel/empresas/nova"><Button className="gap-1"><Plus className="h-4 w-4" /> Nova empresa</Button></Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Leads/Avaliações</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Você ainda não tem empresas.</td></tr>
            ) : items.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  {c.tagline ? <div className="text-xs text-muted-foreground truncate max-w-[280px]">{c.tagline}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status ?? "—"}</Badge>
                </td>
                <td className="px-4 py-3 capitalize">{c.plan ?? "free"}</td>
                <td className="px-4 py-3">{c.views_count ?? 0}</td>
                <td className="px-4 py-3 text-muted-foreground">— / {c.review_count ?? 0}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link to="/empresa/$slug" params={{ slug: c.slug }} target="_blank"><Button size="icon" variant="ghost" aria-label="Ver"><ExternalLink className="h-4 w-4" /></Button></Link>
                    <Link to="/painel/empresas/$id" params={{ id: c.id }}><Button size="icon" variant="ghost" aria-label="Editar"><Pencil className="h-4 w-4" /></Button></Link>
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => remove(c.id, c.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

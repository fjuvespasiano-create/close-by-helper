import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListCompanies, adminUpdateCompany, adminDeleteCompany } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Eye, ChevronLeft, ChevronRight, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/empresas")({
  component: AdminEmpresas,
});

function AdminEmpresas() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("all");
  const [featured, setFeatured] = useState<"all" | "yes" | "no">("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const list = useQuery({
    queryKey: ["admin-companies", q, plan, featured, page],
    queryFn: () => adminListCompanies({ q, plan, featured, page, pageSize }),
    placeholderData: (prev) => prev,
  });

  const rows = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function resetPage() { setPage(1); }

  async function changePlan(id: string, newPlan: string) {
    try {
      await adminUpdateCompany(id, { plan: newPlan });
      toast.success("Plano atualizado");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  async function toggleVerified(id: string, current: boolean) {
    try {
      await adminUpdateCompany(id, { is_verified: !current });
      toast.success(current ? "Verificação removida" : "Marcada como verificada");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  async function toggleFeatured(id: string, current: boolean) {
    try {
      await adminUpdateCompany(id, { featured: !current });
      toast.success(current ? "Destaque removido" : "Marcada como destaque");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  async function remove(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta empresa?")) return;
    try {
      await adminDeleteCompany(id);
      toast.success("Empresa excluída");
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Empresas</h1>
        <p className="text-sm text-muted-foreground">
          {list.isLoading ? "Carregando…" : `${total.toLocaleString("pt-BR")} empresas`}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          placeholder="Buscar pelo nome…"
          value={q}
          onChange={(e) => { setQ(e.target.value); resetPage(); }}
          className="max-w-xs"
        />
        <Select value={plan} onValueChange={(v) => { setPlan(v); resetPage(); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="free">Grátis</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
          </SelectContent>
        </Select>
        <Select value={featured} onValueChange={(v: "all" | "yes" | "no") => { setFeatured(v); resetPage(); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Destaque: todos</SelectItem>
            <SelectItem value="yes">Só destaques</SelectItem>
            <SelectItem value="no">Sem destaque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Contato</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Destaque</th>
              <th className="px-4 py-3">Verificada</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.isLoading && rows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>Carregando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>Nenhuma empresa encontrada</td></tr>
            ) : rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {c.email && <div>{c.email}</div>}
                  {c.phone && <div>{c.phone}</div>}
                  {!c.email && !c.phone && <span>—</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.cities?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Select value={c.plan ?? "free"} onValueChange={(v) => changePlan(c.id, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Grátis</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleFeatured(c.id, !!c.featured)} title="Alternar destaque">
                    <Badge variant={c.featured ? "default" : "outline"}>{c.featured ? "Destaque" : "—"}</Badge>
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleVerified(c.id, !!c.is_verified)} title="Alternar verificação">
                    <Badge variant={c.is_verified ? "default" : "outline"}>{c.is_verified ? "Sim" : "Não"}</Badge>
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-1">
                    <Link to="/painel/empresas/$id" params={{ id: c.id }}>
                      <Button variant="ghost" size="icon" title="Editar"><Pencil className="h-4 w-4" /></Button>
                    </Link>
                    <Link to="/empresa/$slug" params={{ slug: c.slug }} target="_blank">
                      <Button variant="ghost" size="icon" title="Visualizar"><Eye className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id)} title="Excluir">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

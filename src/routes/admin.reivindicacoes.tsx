import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShieldCheck, Search, Loader2, CheckCircle2, XCircle, Clock, FileText, Trash2 } from "lucide-react";
import {
  listCompanyClaimsAdmin,
  reviewCompanyClaim,
  deleteCompanyClaim,
} from "@/lib/company-claims.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/reivindicacoes")({
  head: () => ({
    meta: [
      { title: "Reivindicações de Empresas — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminClaimsPage,
});

type Claim = {
  id: string;
  company_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  role_requested: string;
  full_name: string;
  position: string | null;
  corporate_email: string | null;
  phone: string | null;
  justification: string | null;
  evidence_url: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  companies?: { id: string; name: string; slug: string; logo_url: string | null; owner_id: string | null } | null;
};

const STATUS: Record<Claim["status"], { label: string; className: string; icon: React.ReactNode }> = {
  pending: { label: "Pendente", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: <Clock className="h-3.5 w-3.5" /> },
  approved: { label: "Aprovada", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  rejected: { label: "Rejeitada", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: <XCircle className="h-3.5 w-3.5" /> },
};

function AdminClaimsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | Claim["status"]>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Claim | null>(null);
  const [notes, setNotes] = useState("");

  const listFn = useServerFn(listCompanyClaimsAdmin);
  const reviewFn = useServerFn(reviewCompanyClaim);
  const deleteFn = useServerFn(deleteCompanyClaim);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-claims", statusFilter, search],
    queryFn: () => listFn({ data: { status: (statusFilter || null) as never, search: search || null, limit: 200 } }),
  });

  const rows = (data ?? []) as unknown as Claim[];

  const reviewMut = useMutation({
    mutationFn: (input: { id: string; status: "approved" | "rejected"; admin_notes?: string }) =>
      reviewFn({ data: { id: input.id, status: input.status, admin_notes: input.admin_notes ?? null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-claims"] });
      toast.success("Reivindicação atualizada.");
      setSelected(null);
      setNotes("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-claims"] });
      setSelected(null);
      toast.success("Removida.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const openEvidence = async (path: string) => {
    const { data, error } = await supabase.storage.from("claim-evidence").createSignedUrl(path, 600);
    if (error || !data) return toast.error("Não foi possível abrir o arquivo");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="h-6 w-6 text-primary" />
          Reivindicações de Empresas
        </h1>
        <p className="text-sm text-muted-foreground">
          Aprove ou rejeite solicitações de usuários que desejam gerenciar uma empresa.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome do solicitante…"
            className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | Claim["status"])}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovadas</option>
          <option value="rejected">Rejeitadas</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma reivindicação encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Empresa</th>
                <th className="px-3 py-2">Solicitante</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.companies?.name ?? "—"}</div>
                    {r.companies?.owner_id && (
                      <div className="text-xs text-amber-600">Já possui dono</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div>{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.corporate_email || r.phone || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2 capitalize">{r.role_requested === "owner" ? "Dono" : "Colaborador"}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className={`inline-flex items-center gap-1 ${STATUS[r.status].className}`}>
                      {STATUS[r.status].icon}
                      {STATUS[r.status].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(r);
                        setNotes(r.admin_notes ?? "");
                      }}
                    >
                      Analisar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analisar reivindicação</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border p-3">
                <div className="text-xs uppercase text-muted-foreground">Empresa</div>
                <div className="font-medium">{selected.companies?.name}</div>
                {selected.companies?.owner_id && (
                  <div className="mt-1 text-xs text-amber-600">
                    Atenção: esta empresa já possui um dono associado. Aprovar substituirá o dono atual.
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Info label="Nome" value={selected.full_name} />
                <Info label="Cargo" value={selected.position ?? "—"} />
                <Info label="E-mail corporativo" value={selected.corporate_email ?? "—"} />
                <Info label="Telefone" value={selected.phone ?? "—"} />
                <Info label="Tipo" value={selected.role_requested === "owner" ? "Dono" : "Colaborador"} />
                <Info label="Enviado em" value={format(new Date(selected.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
              </div>

              <div>
                <div className="text-xs uppercase text-muted-foreground">Justificativa</div>
                <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3">{selected.justification || "—"}</p>
              </div>

              {selected.evidence_url && (
                <Button variant="outline" size="sm" onClick={() => openEvidence(selected.evidence_url!)}>
                  <FileText className="mr-2 h-4 w-4" /> Ver comprovante
                </Button>
              )}

              <div>
                <label className="text-xs uppercase text-muted-foreground">Notas do admin (opcional)</label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motivo da decisão…" />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("Excluir esta reivindicação?")) deleteMut.mutate(selected.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => reviewMut.mutate({ id: selected.id, status: "rejected", admin_notes: notes })}
                    disabled={reviewMut.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Rejeitar
                  </Button>
                  <Button
                    onClick={() => reviewMut.mutate({ id: selected.id, status: "approved", admin_notes: notes })}
                    disabled={reviewMut.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Aprovar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

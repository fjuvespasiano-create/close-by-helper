import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  MessageSquarePlus,
  Search,
  Loader2,
  Inbox,
  CheckCircle2,
  Clock,
  Trash2,
  ExternalLink,
} from "lucide-react";
import {
  listUserRequests,
  updateUserRequest,
  deleteUserRequest,
} from "@/lib/user-requests.functions";

export const Route = createFileRoute("/admin/solicitacoes")({
  head: () => ({
    meta: [
      { title: "Solicitações & Pedidos — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRequestsPage,
});

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  respondido: "Respondido",
  resolvido: "Resolvido",
  arquivado: "Arquivado",
};
const STATUS_COLOR: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  em_analise: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  respondido: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  resolvido: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  arquivado: "bg-muted text-muted-foreground",
};
const CATEGORY_LABEL: Record<string, string> = {
  duvida: "Dúvida",
  sugestao: "Sugestão",
  parceria: "Parceria",
  orcamento: "Orçamento",
  cadastro_empresa: "Cadastro empresa",
  cadastro_evento: "Cadastro evento",
  imprensa: "Imprensa",
  elogio: "Elogio",
  reclamacao: "Reclamação",
  outro: "Outro",
};

type Row = {
  id: string;
  request_number: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  page_url: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
};

function AdminRequestsPage() {
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [response, setResponse] = useState("");
  const qc = useQueryClient();
  const listFn = useServerFn(listUserRequests);
  const updateFn = useServerFn(updateUserRequest);
  const deleteFn = useServerFn(deleteUserRequest);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-requests", status, category, search],
    queryFn: () =>
      listFn({
        data: {
          status: (status || null) as never,
          category: (category || null) as never,
          search: search || null,
          limit: 100,
        },
      }),
  });

  const updateMut = useMutation({
    mutationFn: (input: { id: string; status?: string; admin_response?: string }) =>
      updateFn({
        data: {
          id: input.id,
          status: (input.status ?? null) as never,
          admin_response: input.admin_response ?? null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-requests"] });
      toast.success("Solicitação atualizada.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user-requests"] });
      setSelected(null);
      toast.success("Solicitação removida.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = (data?.rows ?? []) as Row[];
  const stats = data?.stats ?? { total: 0, novos: 0, resolvidos: 0, hoje: 0 };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquarePlus className="h-6 w-6 text-primary" />
            Solicitações & Pedidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Mensagens enviadas por visitantes através do formulário público.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={<Inbox className="h-4 w-4" />} label="Total" value={stats.total} />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Novas"
          value={stats.novos}
          accent="text-blue-600"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Resolvidas"
          value={stats.resolvidos}
          accent="text-green-600"
        />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Hoje" value={stats.hoje} />
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por assunto…"
            className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas as categorias</option>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Protocolo</th>
                <th className="px-3 py-2 text-left">Assunto</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Solicitante</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Criado</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-xs">{r.request_number}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{r.subject}</td>
                  <td className="px-3 py-2 text-xs">{CATEGORY_LABEL[r.category] ?? r.category}</td>
                  <td className="px-3 py-2 text-xs">
                    <div>{r.user_name ?? "—"}</div>
                    <div className="text-muted-foreground">{r.user_email ?? r.user_phone ?? ""}</div>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setSelected(r);
                        setResponse(r.admin_response ?? "");
                      }}
                      className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-muted"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-muted-foreground">
                  {selected.request_number}
                </div>
                <h2 className="text-xl font-bold">{selected.subject}</h2>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${STATUS_COLOR[selected.status]}`}
                  >
                    {STATUS_LABEL[selected.status]}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {CATEGORY_LABEL[selected.category]}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-semibold">Descrição</h3>
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                  {selected.description}
                </p>
              </div>

              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Nome: </span>
                  {selected.user_name ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">E-mail: </span>
                  {selected.user_email ? (
                    <a href={`mailto:${selected.user_email}`} className="text-primary hover:underline">
                      {selected.user_email}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone: </span>
                  {selected.user_phone ? (
                    <a
                      href={`https://wa.me/${selected.user_phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selected.user_phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </div>
                {selected.page_url && (
                  <div>
                    <span className="text-muted-foreground">Página: </span>
                    <a
                      href={selected.page_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      abrir <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Resposta interna</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Anotações internas ou rascunho de resposta…"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      updateMut.mutate({
                        id: selected.id,
                        status: e.target.value,
                        admin_response: response,
                      })
                    }
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      updateMut.mutate({ id: selected.id, admin_response: response })
                    }
                    disabled={updateMut.isPending}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {updateMut.isPending ? "Salvando…" : "Salvar"}
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (confirm("Excluir esta solicitação?")) deleteMut.mutate(selected.id);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = "text-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 text-2xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listQaTickets, getQaTicket, updateQaTicket, addQaComment } from "@/lib/qa.functions";
import { Bug, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/qa")({
  head: () => ({ meta: [{ title: "Central de Qualidade — Admin" }, { name: "robots", content: "noindex" }] }),
  component: QaAdminPage,
});

const STATUSES = [
  { value: "novo", label: "Novo" },
  { value: "em_analise", label: "Em análise" },
  { value: "reproduzido", label: "Reproduzido" },
  { value: "em_desenvolvimento", label: "Em desenvolvimento" },
  { value: "corrigido", label: "Corrigido" },
  { value: "publicado", label: "Publicado" },
  { value: "fechado", label: "Fechado" },
] as const;

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
] as const;

const TYPES = [
  ["erro","Erro"],["bug","Bug"],["info_incorreta","Info incorreta"],["empresa","Empresa"],["evento","Evento"],
  ["noticia","Notícia"],["layout","Layout"],["lentidao","Lentidão"],["funcionalidade","Funcionalidade"],
  ["sugestao","Sugestão"],["outro","Outro"],
] as const;

const STATUS_COLOR: Record<string, string> = {
  novo: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  em_analise: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200",
  reproduzido: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  em_desenvolvimento: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  corrigido: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  publicado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  fechado: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PRIORITY_COLOR: Record<string, string> = {
  baixa: "text-gray-600",
  media: "text-blue-600",
  alta: "text-orange-600",
  critica: "text-red-600 font-bold",
};

function QaAdminPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ status?: string; type?: string; priority?: string; search?: string }>({});
  const list = useServerFn(listQaTickets);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["qa-tickets", filters],
    queryFn: () =>
      list({
        data: {
          status: (filters.status ?? null) as never,
          type: (filters.type ?? null) as never,
          priority: (filters.priority ?? null) as never,
          search: filters.search ?? null,
          limit: 150,
        },
      }),
  });

  const stats = query.data?.stats;
  const rows = query.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl font-bold">Central de Qualidade</h1>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["qa-tickets"] })}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" /> Atualizar
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Total" value={stats.total} />
          <Stat label="Pendentes" value={stats.pendentes} tone="text-blue-600" />
          <Stat label="Resolvidos" value={stats.resolvidos} tone="text-green-600" />
          <Stat label="Críticos" value={stats.criticos} tone="text-red-600" />
          <Stat label="Hoje" value={stats.hoje} tone="text-purple-600" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={STATUSES.map((s) => [s.value, s.label] as const)}
        />
        <FilterSelect
          label="Tipo"
          value={filters.type}
          onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          options={TYPES as unknown as readonly (readonly [string, string])[]}
        />
        <FilterSelect
          label="Prioridade"
          value={filters.priority}
          onChange={(v) => setFilters((f) => ({ ...f, priority: v }))}
          options={PRIORITIES.map((p) => [p.value, p.label] as const)}
        />
        <input
          placeholder="Buscar na descrição…"
          value={filters.search ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border">
        {query.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum ticket encontrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Ticket</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2">Página</th>
                <th className="px-3 py-2">Usuário</th>
                <th className="px-3 py-2">Prioridade</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Quando</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpenId(r.id)}
                  className="cursor-pointer border-t hover:bg-muted/40"
                >
                  <td className="px-3 py-2 font-mono text-xs">{r.ticket_number}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2 max-w-[280px] truncate">{r.description}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate text-xs text-muted-foreground">{r.page_title ?? r.page_url ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.user_email ?? "anônimo"}</td>
                  <td className={`px-3 py-2 text-xs ${PRIORITY_COLOR[r.priority ?? "media"]}`}>{r.priority}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[r.status ?? "novo"]}`}>
                      {STATUSES.find((s) => s.value === r.status)?.label ?? r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openId && <TicketDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value?: string;
  onChange: (v?: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="rounded-md border bg-background px-3 py-2 text-sm"
      aria-label={label}
    >
      <option value="">{label}: todos</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

function TicketDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const get = useServerFn(getQaTicket);
  const update = useServerFn(updateQaTicket);
  const comment = useServerFn(addQaComment);
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const q = useQuery({ queryKey: ["qa-ticket", id], queryFn: () => get({ data: { id } }) });

  const mutStatus = useMutation({
    mutationFn: (status: string) => update({ data: { id, status: status as never } }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["qa-ticket", id] });
      qc.invalidateQueries({ queryKey: ["qa-tickets"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const mutPri = useMutation({
    mutationFn: (priority: string) => update({ data: { id, priority: priority as never } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["qa-ticket", id] });
      qc.invalidateQueries({ queryKey: ["qa-tickets"] });
    },
  });
  const mutComment = useMutation({
    mutationFn: () => comment({ data: { ticket_id: id, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["qa-ticket", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const t = q.data?.ticket;
  const device = useMemo(() => (t?.device as Record<string, unknown>) ?? {}, [t]);
  const logs = useMemo(() => (t?.console_logs as Array<{ level: string; ts: number; message: string }>) ?? [], [t]);
  const net = useMemo(() => (t?.network_logs as Array<{ method: string; url: string; status?: number; duration_ms?: number }>) ?? [], [t]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-2xl overflow-y-auto bg-background p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm">{t?.ticket_number ?? "…"}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {q.isLoading || !t ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Descrição</div>
              <p className="mt-1 whitespace-pre-wrap">{t.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">
                Status
                <select
                  value={t.status ?? "novo"}
                  onChange={(e) => mutStatus.mutate(e.target.value)}
                  className="mt-1 w-full rounded border bg-background px-2 py-1.5 text-sm"
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
              <label className="text-xs text-muted-foreground">
                Prioridade
                <select
                  value={t.priority ?? "media"}
                  onChange={(e) => mutPri.mutate(e.target.value)}
                  className="mt-1 w-full rounded border bg-background px-2 py-1.5 text-sm"
                >
                  {PRIORITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>

            <InfoGrid title="Página" rows={[["URL", t.page_url ?? "—"], ["Título", t.page_title ?? "—"]]} />
            <InfoGrid
              title="Usuário"
              rows={[
                ["Nome", t.user_name ?? "—"],
                ["Email", t.user_email ?? "anônimo"],
                ["IP", t.ip ?? "—"],
              ]}
            />
            <InfoGrid
              title="Dispositivo"
              rows={Object.entries(device).map(([k, v]) => [k, String(v ?? "—")])}
            />

            {q.data?.screenshotSignedUrl && (
              <div>
                <div className="mb-1 text-xs uppercase text-muted-foreground">Screenshot</div>
                <img src={q.data.screenshotSignedUrl} alt="screenshot" className="max-h-96 w-full rounded border object-contain" />
              </div>
            )}

            {logs.length > 0 && (
              <div>
                <div className="mb-1 text-xs uppercase text-muted-foreground">Console ({logs.length})</div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded border bg-muted/30 p-2 font-mono text-xs">
                  {logs.map((l, i) => (
                    <div key={i} className={l.level === "error" ? "text-red-600" : "text-yellow-700"}>
                      [{l.level}] {l.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {net.length > 0 && (
              <div>
                <div className="mb-1 text-xs uppercase text-muted-foreground">Rede ({net.length})</div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded border bg-muted/30 p-2 font-mono text-xs">
                  {net.map((n, i) => (
                    <div key={i}>
                      <span className="font-bold">{n.method}</span>{" "}
                      <span className={(n.status ?? 0) >= 400 ? "text-red-600" : ""}>{n.status ?? "ERR"}</span>{" "}
                      <span className="text-muted-foreground">{n.duration_ms}ms</span>{" "}
                      {n.url}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 text-xs uppercase text-muted-foreground">Comentários internos</div>
              <div className="space-y-2">
                {q.data?.comments.map((c) => (
                  <div key={c.id} className="rounded border bg-muted/30 p-2 text-sm">
                    <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</div>
                    <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                placeholder="Comentário interno da equipe…"
                className="mt-2 w-full rounded border bg-background px-2 py-1.5 text-sm"
              />
              <button
                onClick={() => body.trim() && mutComment.mutate()}
                disabled={mutComment.isPending || !body.trim()}
                className="mt-2 rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                Adicionar comentário
              </button>
            </div>

            <div>
              <div className="mb-1 text-xs uppercase text-muted-foreground">Histórico</div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {q.data?.events.map((e) => (
                  <li key={e.id}>
                    {new Date(e.created_at).toLocaleString("pt-BR")} — {e.kind}{" "}
                    {e.payload ? JSON.stringify(e.payload) : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoGrid({ title, rows }: { title: string; rows: [string, string][] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs uppercase text-muted-foreground">{title}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded border p-2 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <div className="text-muted-foreground">{k}</div>
            <div className="truncate" title={v}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson, FileText, Search } from "lucide-react";
import {
  STACK, CONVENTIONS, FEATURES, API_ENDPOINTS, SERVER_FUNCTIONS,
  TABLES, ADMIN_ROUTES, PUBLIC_ROUTES, PANEL_ROUTES, ENV_VARS, CLONE_STEPS,
} from "@/lib/tech-docs";

export const Route = createFileRoute("/admin/documentacao")({
  head: () => ({
    meta: [
      { title: "Documentação Técnica — AgenddaAqui Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocsPage,
});

function buildMarkdown(): string {
  const l: string[] = [];
  l.push("# AgenddaAqui — Documentação Técnica Completa\n");
  l.push(`_Gerado em ${new Date().toISOString()}_\n`);
  l.push("Este documento é o blueprint técnico do projeto. Objetivo: permitir que qualquer IA ou desenvolvedor leia, entenda e clone um projeto idêntico.\n");

  l.push("\n## 1. Stack\n");
  for (const [k, v] of Object.entries(STACK)) l.push(`- **${k}**: ${v}`);

  l.push("\n## 2. Convenções obrigatórias\n");
  CONVENTIONS.forEach((c) => l.push(`- ${c}`));

  l.push("\n## 3. Variáveis de ambiente\n");
  l.push("### Browser (import.meta.env)");
  ENV_VARS.browser.forEach((v) => l.push(`- \`${v}\``));
  l.push("\n### Server (process.env — ler DENTRO do handler)");
  ENV_VARS.server.forEach((v) => l.push(`- \`${v}\``));

  l.push("\n## 4. Funcionalidades\n");
  FEATURES.forEach((f) => {
    l.push(`\n### ${f.title} (\`${f.id}\`)`);
    l.push(f.description);
    if (f.routes.length) l.push(`- **Rotas**: ${f.routes.map((r) => `\`${r}\``).join(", ")}`);
    if (f.tables.length) l.push(`- **Tabelas**: ${f.tables.map((t) => `\`${t}\``).join(", ")}`);
    if (f.files.length) l.push(`- **Arquivos-chave**: ${f.files.map((x) => `\`${x}\``).join(", ")}`);
  });

  l.push("\n## 5. Endpoints HTTP públicos (server routes)\n");
  l.push("| Método | Path | Auth | Arquivo | Descrição |");
  l.push("|---|---|---|---|---|");
  API_ENDPOINTS.forEach((e) =>
    l.push(`| ${e.method} | \`${e.path}\` | ${e.auth} | \`${e.file}\` | ${e.description} |`),
  );

  l.push("\n## 6. Server Functions (createServerFn)\n");
  SERVER_FUNCTIONS.forEach((s) => l.push(`- **${s.name}** — \`${s.file}\` — ${s.description}`));

  l.push("\n## 7. Tabelas do banco (RLS obrigatório)\n");
  l.push("| Tabela | Propósito | RLS |");
  l.push("|---|---|---|");
  TABLES.forEach((t) => l.push(`| \`${t.name}\` | ${t.purpose} | ${t.rls} |`));

  l.push("\n## 8. Rotas admin\n");
  ADMIN_ROUTES.forEach((r) => l.push(`- \`${r.path}\` — ${r.description} (\`${r.file}\`)`));

  l.push("\n## 9. Rotas públicas\n");
  PUBLIC_ROUTES.forEach((r) => l.push(`- \`${r.path}\` — ${r.description} (\`${r.file}\`)`));

  l.push("\n## 10. Rotas do painel (autenticado)\n");
  PANEL_ROUTES.forEach((r) => l.push(`- \`${r.path}\` — ${r.description} (\`${r.file}\`)`));

  l.push("\n## 11. Passos para clonar\n");
  CLONE_STEPS.forEach((s) => l.push(`- ${s}`));

  l.push("\n---\n_Fim do documento._\n");
  return l.join("\n");
}

function buildJson(): string {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      project: "AgenddaAqui",
      stack: STACK,
      conventions: CONVENTIONS,
      envVars: ENV_VARS,
      features: FEATURES,
      apiEndpoints: API_ENDPOINTS,
      serverFunctions: SERVER_FUNCTIONS,
      tables: TABLES,
      routes: {
        admin: ADMIN_ROUTES,
        public: PUBLIC_ROUTES,
        panel: PANEL_ROUTES,
      },
      cloneSteps: CLONE_STEPS,
    },
    null,
    2,
  );
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DocsPage() {
  const [q, setQ] = useState("");
  const md = useMemo(buildMarkdown, []);
  const json = useMemo(buildJson, []);

  const filter = (s: string) => (q ? s.toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Documentação Técnica</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Blueprint completo — funcionalidades, APIs, rotas, banco e stack. Pronto para IAs lerem e clonarem o projeto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => download("agenddaaqui-docs.md", md, "text/markdown")}>
            <FileText className="mr-2 h-4 w-4" /> Baixar Markdown
          </Button>
          <Button variant="outline" onClick={() => download("agenddaaqui-docs.json", json, "application/json")}>
            <FileJson className="mr-2 h-4 w-4" /> Baixar JSON
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              download(
                "agenddaaqui-docs.txt",
                md.replace(/[#`*|]/g, ""),
                "text/plain",
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Baixar TXT
          </Button>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por nome (rota, tabela, endpoint…)"
          className="pl-9"
        />
      </div>

      <Section title="Stack">
        <dl className="grid gap-3 sm:grid-cols-2">
          {Object.entries(STACK).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-card p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Convenções obrigatórias">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {CONVENTIONS.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </Section>

      <Section title="Variáveis de ambiente">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Browser</h3>
            <ul className="space-y-1 text-xs font-mono">
              {ENV_VARS.browser.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-2 text-sm font-semibold">Server</h3>
            <ul className="space-y-1 text-xs font-mono">
              {ENV_VARS.server.map((v) => <li key={v}>{v}</li>)}
            </ul>
          </div>
        </div>
      </Section>

      <Section title={`Funcionalidades (${FEATURES.length})`}>
        <div className="grid gap-3 md:grid-cols-2">
          {FEATURES.filter((f) => filter(f.title) || filter(f.id) || filter(f.description)).map((f) => (
            <article key={f.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{f.title}</h3>
                <Badge variant="outline" className="font-mono text-[10px]">{f.id}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              {f.routes.length > 0 && (
                <p className="mt-2 text-xs"><span className="font-semibold">Rotas:</span> {f.routes.join(", ")}</p>
              )}
              {f.tables.length > 0 && (
                <p className="mt-1 text-xs"><span className="font-semibold">Tabelas:</span> {f.tables.join(", ")}</p>
              )}
              {f.files.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground"><span className="font-semibold">Arquivos:</span> {f.files.join(", ")}</p>
              )}
            </article>
          ))}
        </div>
      </Section>

      <Section title={`Endpoints HTTP (${API_ENDPOINTS.length})`}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Método</th>
                <th className="px-3 py-2 text-left">Path</th>
                <th className="px-3 py-2 text-left">Auth</th>
                <th className="px-3 py-2 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {API_ENDPOINTS.filter((e) => filter(e.path) || filter(e.description)).map((e) => (
                <tr key={e.path} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{e.method}</td>
                  <td className="px-3 py-2 font-mono text-xs">{e.path}</td>
                  <td className="px-3 py-2 text-xs"><Badge variant="secondary">{e.auth}</Badge></td>
                  <td className="px-3 py-2 text-xs">{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`Server Functions (${SERVER_FUNCTIONS.length})`}>
        <ul className="grid gap-2 md:grid-cols-2">
          {SERVER_FUNCTIONS.filter((s) => filter(s.name) || filter(s.description)).map((s) => (
            <li key={s.name} className="rounded-lg border border-border bg-card p-3">
              <div className="font-mono text-xs font-semibold">{s.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.file}</div>
              <div className="mt-1 text-sm">{s.description}</div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={`Tabelas (${TABLES.length})`}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Tabela</th>
                <th className="px-3 py-2 text-left">Propósito</th>
                <th className="px-3 py-2 text-left">RLS</th>
              </tr>
            </thead>
            <tbody>
              {TABLES.filter((t) => filter(t.name) || filter(t.purpose)).map((t) => (
                <tr key={t.name} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{t.name}</td>
                  <td className="px-3 py-2 text-xs">{t.purpose}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{t.rls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`Rotas Admin (${ADMIN_ROUTES.length})`}>
        <RouteList routes={ADMIN_ROUTES} filter={filter} />
      </Section>
      <Section title={`Rotas Públicas (${PUBLIC_ROUTES.length})`}>
        <RouteList routes={PUBLIC_ROUTES} filter={filter} />
      </Section>
      <Section title={`Rotas Painel (${PANEL_ROUTES.length})`}>
        <RouteList routes={PANEL_ROUTES} filter={filter} />
      </Section>

      <Section title="Passos para clonar o projeto">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {CLONE_STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function RouteList({
  routes,
  filter,
}: {
  routes: { path: string; file: string; description: string }[];
  filter: (s: string) => boolean;
}) {
  const list = routes.filter((r) => filter(r.path) || filter(r.description) || filter(r.file));
  return (
    <ul className="grid gap-1.5 md:grid-cols-2">
      {list.map((r) => (
        <li key={r.file} className="rounded-md border border-border bg-card px-3 py-2 text-xs">
          <div className="font-mono font-semibold">{r.path}</div>
          <div className="text-muted-foreground">{r.description}</div>
          <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.file}</div>
        </li>
      ))}
    </ul>
  );
}

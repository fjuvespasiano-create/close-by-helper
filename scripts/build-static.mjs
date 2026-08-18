#!/usr/bin/env node
/**
 * Gera o pacote estático para hospedagem sem Node (HostGator / Apache).
 *
 * Passos:
 *  1. Roda `vite build` com STATIC_BUILD=1 (modo SPA, sem SSR).
 *  2. Descobre a pasta de saída com os arquivos do cliente.
 *  3. Gera `sitemap.xml` consultando o Supabase (chaves públicas).
 *  4. Copia `.htaccess` (rewrite SPA + cache + gzip) para a raiz do pacote.
 *  5. Copia o resultado para `dist-hostgator/` — é essa pasta que vai no
 *     `public_html` via FTP/cPanel.
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "dist-hostgator");
const BASE_URL = process.env.SITE_URL ?? "https://close-by-helper.lovable.app";

function run(cmd, args, env = {}) {
  // O prerender do TanStack sobe um servidor temporário que às vezes não
  // encerra sozinho; por isso usamos timeout e validamos a saída em disco.
  return spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: process.platform === "win32",
    timeout: Number(process.env.BUILD_TIMEOUT_MS ?? 15 * 60 * 1000),
  });
}

function findClientDir() {
  const candidates = [
    ".output/public",
    "dist/client",
    ".tanstack/start/build/client-dist",
    "dist",
  ].map((p) => join(root, p));
  for (const c of candidates) {
    if (existsSync(join(c, "index.html")) || existsSync(join(c, "_shell.html"))) return c;
  }
  throw new Error(
    "Não encontrei o index.html gerado. Verifique a saída do build antes de empacotar.",
  );
}

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return undefined;
  const line = readFileSync(envPath, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line?.slice(key.length + 1).trim().replace(/^"|"$/g, "");
}

async function buildSitemap() {
  const url = envValue("VITE_SUPABASE_URL") ?? envValue("SUPABASE_URL");
  const key = envValue("VITE_SUPABASE_PUBLISHABLE_KEY") ?? envValue("SUPABASE_PUBLISHABLE_KEY");

  const staticPaths = [
    ["/", "daily", "1.0"],
    ["/buscar", "weekly", "0.9"],
    ["/sobre", "monthly", "0.5"],
    ["/contato", "monthly", "0.5"],
    ["/planos", "monthly", "0.6"],
    ["/blog", "daily", "0.9"],
    ["/eventos", "daily", "0.8"],
    ["/empregos", "daily", "0.8"],
    ["/marketplace", "daily", "0.7"],
    ["/promocoes", "daily", "0.7"],
    ["/o-que-fazer", "weekly", "0.7"],
    ["/roteiro-turistico", "weekly", "0.7"],
    ["/servicos-publicos", "monthly", "0.7"],
    ["/transporte", "weekly", "0.6"],
    ["/emergencia", "monthly", "0.7"],
    ["/ao-vivo", "hourly", "0.7"],
    ["/agora", "hourly", "0.6"],
    ["/representantes", "weekly", "0.6"],
    ["/reputacao", "monthly", "0.5"],
    ["/transparencia", "monthly", "0.5"],
    ["/vespasiano", "weekly", "0.8"],
    ["/ofertas-shopee", "weekly", "0.6"],
    ["/cadastre-sua-empresa", "monthly", "0.7"],
  ];

  const entries = staticPaths.map(([path, changefreq, priority]) => ({
    path,
    changefreq,
    priority,
  }));

  if (url && key) {
    const rest = async (table, select, filter = "") => {
      try {
        const res = await fetch(`${url}/rest/v1/${table}?select=${select}${filter}`, {
          headers: { apikey: key },
        });
        if (!res.ok) return [];
        return await res.json();
      } catch {
        return [];
      }
    };
    const [cities, cats, companies, posts, events] = await Promise.all([
      rest("cities", "slug", "&is_active=eq.true"),
      rest("categories", "slug"),
      rest("companies", "slug,updated_at", "&status=eq.active"),
      rest("posts", "slug,updated_at", "&status=eq.published&type=eq.blog"),
      rest("events", "slug,updated_at", "&status=eq.published"),
    ]);
    for (const c of cities) entries.push({ path: `/cidades/${c.slug}`, changefreq: "weekly", priority: "0.7" });
    for (const c of cats) entries.push({ path: `/categoria/${c.slug}`, changefreq: "weekly", priority: "0.6" });
    for (const c of companies) entries.push({ path: `/empresa/${c.slug}`, lastmod: c.updated_at, changefreq: "weekly", priority: "0.7" });
    for (const p of posts) entries.push({ path: `/blog/${p.slug}`, lastmod: p.updated_at, changefreq: "monthly", priority: "0.6" });
    for (const e of events) entries.push({ path: `/eventos/${e.slug}`, lastmod: e.updated_at, changefreq: "weekly", priority: "0.6" });
  } else {
    console.warn("[sitemap] Variáveis do Supabase ausentes — gerando apenas rotas fixas.");
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map((e) =>
      [
        "  <url>",
        `    <loc>${BASE_URL}${e.path}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    `</urlset>`,
  ].join("\n");
}

async function main() {
  console.log("→ Build estático (SPA, sem SSR)...");
  run("bun", ["run", "vite", "build"], { STATIC_BUILD: "1" });

  const clientDir = findClientDir();
  console.log(`→ Arquivos do cliente: ${clientDir}`);

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  cpSync(clientDir, OUT, { recursive: true });

  // O modo SPA gera `_shell.html`; o Apache precisa de um `index.html` na raiz.
  if (!existsSync(join(OUT, "index.html")) && existsSync(join(OUT, "_shell.html"))) {
    cpSync(join(OUT, "_shell.html"), join(OUT, "index.html"));
    console.log("→ index.html criado a partir de _shell.html.");
  }

  console.log("→ Gerando sitemap.xml...");
  writeFileSync(join(OUT, "sitemap.xml"), await buildSitemap(), "utf8");

  const htaccess = join(root, "deploy", "hostgator", ".htaccess");
  if (existsSync(htaccess)) {
    cpSync(htaccess, join(OUT, ".htaccess"));
    console.log("→ .htaccess copiado.");
  }

  console.log(`\n✅ Pacote pronto em: ${OUT}`);
  console.log("   Envie TODO o conteúdo dessa pasta para o public_html da HostGator.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

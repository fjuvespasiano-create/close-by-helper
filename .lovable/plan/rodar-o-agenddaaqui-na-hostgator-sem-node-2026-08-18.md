# Rodar o AgenddaAqui na HostGator (sem Node)

## Diagnóstico

A HostGator (hospedagem compartilhada, Apache + PHP) **não executa Node.js**. Hoje o projeto depende de servidor Node/Worker em três pontos:

1. **SSR** (renderização no servidor de todas as páginas).
2. **18 arquivos de server functions** (~75 funções): push, backup, scrapers, blog AI, reivindicações, QA, empregos, solicitações etc.
3. **13 rotas de API/webhooks** (`/api/public/hooks/*`, `/api/public/push/*`) chamadas por cron e serviços externos.
4. **Sitemap dinâmico** gerado no servidor.

O que **é possível**: transformar o frontend em site 100% estático (SPA) hospedado na HostGator, e mover todo o backend para o Supabase (que já é o banco). A HostGator serve apenas HTML/CSS/JS; o Supabase cuida de dados, auth, storage, funções e agendamentos.

## Arquitetura alvo

```text
Navegador
   │
   ├── HostGator (Apache)  →  arquivos estáticos: index.html, /assets/*, sw.js, .htaccess
   │
   └── Supabase  →  Postgres + RLS, Auth, Storage, Edge Functions, pg_cron
```

## O que muda

### Frontend (fica na HostGator)
- Build em modo SPA: sem SSR, uma única `index.html` que carrega todas as rotas no navegador.
- `.htaccess` com rewrite de todas as URLs para `index.html` (senão `/blog/x` dá 404 no Apache) + regras de cache e compressão.
- Sitemap e `robots.txt` passam a ser gerados no build (arquivo físico `sitemap.xml`), não mais em tempo de requisição.
- PWA/service worker continuam funcionando normalmente.

### Backend (vai para o Supabase Edge Functions)
Cada server function e cada rota de webhook vira uma Edge Function equivalente, com a mesma validação de permissão (admin/role) e os mesmos segredos. Grupos:
- Push (assinaturas, envio, agendador, tracking)
- Scrapers (Vespasiano, SJL, Câmara, serviços, eventos, licitações, ônibus, representantes)
- Blog AI e post diário
- Empregos (sync e admin)
- Backup/restauração, QA, duplicados, reivindicações, solicitações, WhatsApp
- Os agendamentos (`pg_cron`) passam a apontar para as URLs das Edge Functions.

O código React chama as Edge Functions via `supabase.functions.invoke(...)`, substituindo `useServerFn`.

### Banco de dados
- Nenhuma mudança de schema é necessária se você mantiver o banco atual.
- Se quiser sair também do banco gerenciado, é feita a exportação completa (schema + dados + usuários de auth) e a importação em um projeto Supabase próprio, atualizando as variáveis do frontend.

## Perdas e limitações honestas
- **Sem SSR = SEO mais fraco**: hoje as páginas de empresa, blog e eventos chegam prontas ao Google. Em SPA o conteúdo depende de JavaScript. Mitigação parcial: pré-renderizar no build as páginas estáveis (home, institucionais, categorias, cidades) e manter as dinâmicas em SPA — mas o conteúdo novo (post publicado hoje) só aparece no HTML após um novo build/upload.
- **Deploy manual**: cada alteração exige gerar o build e subir a pasta por FTP/cPanel.
- **Segredos**: nenhuma chave privada pode ficar no frontend; todas passam para as Edge Functions.

## Alternativa recomendada
Publicar o frontend na Cloudflare Pages ou Vercel (gratuito, mantém SSR e SEO) e apontar seu domínio da HostGator para lá via DNS. Você continua pagando só a HostGator pelo domínio/e-mail, sem perder SSR nem precisar reescrever o backend.

## Entrega proposta (se seguirmos com HostGator)

**Fase 1 — Pacote estático**
- Configurar build SPA + geração de `sitemap.xml` no build.
- Criar `.htaccess` (rewrite, gzip/brotli, cache, HTTPS).
- Criar `DEPLOY-HOSTGATOR.md` com o passo a passo de upload.

**Fase 2 — Migração do backend**
- Portar as ~75 server functions e 13 webhooks para Edge Functions, em lotes por módulo.
- Trocar as chamadas no frontend para `functions.invoke`.
- Reapontar os cron jobs.

**Fase 3 — Banco próprio (opcional)**
- Dump completo, importação no seu Supabase, troca das variáveis de ambiente.

## Detalhes técnicos
- SPA via `ssr: false` na configuração do TanStack Start, gerando `dist/client` como raiz do `public_html`.
- `.htaccess`: `RewriteCond %{REQUEST_FILENAME} !-f` → `RewriteRule . /index.html [L]`.
- Edge Functions em Deno; `supabaseAdmin` só dentro delas; verificação de role via RPC `has_role`.
- Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` são embutidas no build (são públicas, sem risco).

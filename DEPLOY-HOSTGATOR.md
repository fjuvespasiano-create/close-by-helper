# Deploy do AgenddaAqui na HostGator (hospedagem sem Node)

Este guia gera um pacote **100% estático** (HTML + CSS + JS) que roda em qualquer
hospedagem Apache/cPanel — inclusive planos compartilhados da HostGator, que **não
executam Node.js**.

```text
Navegador
   │
   ├── HostGator (Apache)  →  index.html, /assets/*, sw.js, sitemap.xml, .htaccess
   │
   └── Supabase            →  Postgres + RLS, Auth, Storage, Edge Functions, pg_cron
```

---

## 1. Gerar o pacote

Na sua máquina (com Node 20+ e Bun instalados):

```bash
git clone https://github.com/fjuvespasiano-create/close-by-helper.git
cd close-by-helper
bun install
cp .env.example .env   # se não existir, crie o .env com as variáveis abaixo
bun run build:static
```

Variáveis necessárias no `.env` (são chaves **públicas**, podem ir no build):

```env
VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
VITE_SUPABASE_PROJECT_ID="seu-projeto"
SITE_URL="https://seudominio.com.br"   # usado no sitemap.xml
```

O resultado fica em **`dist-hostgator/`**:

- `index.html` — casca do app (SPA)
- pastas pré-renderizadas por rota (`/blog/index.html`, `/vespasiano/index.html`, …)
- `assets/` — JS e CSS com hash
- `sitemap.xml` — gerado no build, com empresas, posts, eventos, cidades e categorias
- `robots.txt`, `manifest.webmanifest`, `sw.js`, `offline.html` (PWA)
- `.htaccess` — rewrite SPA, HTTPS, cache e compressão

> Dica: se o processo de build ficar parado no final (o pré-renderizador às vezes não
> encerra o servidor temporário), pode interromper com `Ctrl+C` e rodar
> `SKIP_BUILD=1 node scripts/build-static.mjs` para empacotar o que já foi gerado.

## 2. Enviar para a HostGator

1. cPanel → **Gerenciador de Arquivos** → `public_html`.
2. Apague o conteúdo antigo (guarde um backup).
3. Envie **todo o conteúdo de `dist-hostgator/`** (não a pasta em si) para `public_html`.
   - Por FTP: `FileZilla`, arrastando o conteúdo da pasta.
   - Confirme que o `.htaccess` subiu (ative "mostrar arquivos ocultos").
4. cPanel → **SSL/TLS Status** → emita/renove o certificado (AutoSSL) do domínio.
5. Acesse `https://seudominio.com.br` e teste uma rota interna, ex.
   `https://seudominio.com.br/blog` — se der 404, o `.htaccess` não subiu.

## 3. Configurar o Supabase para o novo domínio

No projeto Supabase (Authentication → URL Configuration):

- **Site URL**: `https://seudominio.com.br`
- **Redirect URLs**: `https://seudominio.com.br/**`

No Google Cloud Console (OAuth), adicione o domínio nas origens autorizadas.

E em Storage/CORS: libere o domínio se você usa uploads diretos.

---

## 4. O que continua funcionando sem servidor

Tudo que o navegador faz direto contra o Supabase:

- Login/cadastro (e-mail e Google), sessões e recuperação de senha
- Listagens públicas: empresas, categorias, cidades, blog, eventos, empregos,
  promoções, marketplace, representantes, serviços públicos, ofertas Shopee
- Painel do comerciante: perfil, empresas, anúncios, avaliações, favoritos, leads
- Uploads no Storage, Realtime (feed ao vivo), PWA/offline

## 5. O que precisa migrar para Edge Functions

Estas funcionalidades hoje rodam no servidor Node do Lovable (`createServerFn` e
rotas `/api/public/*`). Em hospedagem sem Node **elas param de responder** até serem
recriadas como Supabase Edge Functions (Deno) e chamadas via
`supabase.functions.invoke("nome", { body })`:

| Módulo | Arquivos atuais | Vira a Edge Function |
| --- | --- | --- |
| Push (assinar/enviar/agendar/tracking) | `src/lib/push.functions.ts`, `admin-push.functions.ts`, `api/public/push/*`, `api/public/hooks/push-scheduler.ts` | `push-subscribe`, `push-send`, `push-scheduler`, `push-track` |
| Scrapers | `scrape-*.functions.ts`, `*-scrape.server.ts`, `api/public/hooks/scrape-*` | `scrape-vespasiano`, `scrape-sjl`, `scrape-camara-sjl`, `scrape-services`, `scrape-events`, `scrape-procurements`, `sync-bus`, `sync-representatives` |
| Blog AI | `blog-ai.functions.ts`, `api/public/hooks/daily-blog-post.ts` | `blog-ai`, `daily-blog-post` |
| Empregos | `jobs.functions.ts`, `admin-jobs.functions.ts`, `api/public/hooks/jobs-sync.ts` | `jobs-admin`, `jobs-sync` |
| Backup / QA / Duplicados | `admin-backup.functions.ts`, `qa.functions.ts`, `duplicates.functions.ts` | `admin-backup`, `qa`, `duplicates` |
| Reivindicações / Solicitações | `company-claims.functions.ts`, `user-requests.functions.ts` | `company-claims`, `user-requests` |
| WhatsApp | `whatsapp-subscribe.functions.ts`, `whatsapp-weekly-digest.server.ts`, `api/public/hooks/whatsapp-*` | `whatsapp-subscribe`, `whatsapp-digest`, `whatsapp-opt-out` |
| Detecção de cidade | `cityDetect.functions.ts` | `city-detect` |

Regras ao portar:

- Segredos (`FIRECRAWL_API_KEY`, `VAPID_*`, `LOVABLE_API_KEY`/chave de IA, `CRON_SECRET`)
  ficam **apenas** nos secrets da Edge Function — nunca no build do frontend.
- Cada função que hoje valida admin deve continuar validando: `has_role(auth.uid(), 'admin')`.
- Os agendamentos em `pg_cron` passam a chamar as URLs
  `https://SEU-PROJETO.supabase.co/functions/v1/<nome>`.

> Observação: essas Edge Functions precisam ser criadas fora do editor Lovable
> (CLI do Supabase: `supabase functions new <nome>` + `supabase functions deploy`).

## 6. Limitações honestas dessa hospedagem

- **Sem SSR**: o HTML pré-renderizado é a casca do app; conteúdo dinâmico (post novo,
  empresa nova) só entra no HTML depois de um novo `build:static` + upload. O Google
  indexa, mas com menos força que hoje.
- **Deploy manual**: cada alteração exige gerar o pacote e subir por FTP/cPanel.
- **Sitemap "congelado"** entre builds — rode o build periodicamente ou automatize.

## 7. Alternativa recomendada (mantém SSR)

Publique o frontend na **Cloudflare Pages** ou **Vercel** (planos gratuitos, com Node)
e aponte o domínio da HostGator para lá via DNS (registro CNAME). Você mantém SSR,
SEO forte, deploy automático a cada push no GitHub e continua usando a HostGator para
domínio e e-mail — sem precisar reescrever nenhuma função de servidor.

## 8. Banco de dados próprio (opcional)

1. Crie o projeto no Supabase.
2. Exporte o banco atual: `supabase db dump -f backup.sql --data-only` e o schema
   com `--schema-only` (ou use `/admin/backup` para gerar JSON/SQL das 29 tabelas).
3. Importe: `psql "$NOVA_URL" -f schema.sql && psql "$NOVA_URL" -f backup.sql`.
4. Recrie Storage buckets, políticas e usuários de Auth.
5. Atualize `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` e refaça o build.

// Documentação técnica completa do AgenddaAqui.
// Gerada para consumo humano (Admin) e por IAs (download em MD/JSON)
// com o objetivo de permitir clonagem/reprodução do projeto.

export type ApiEndpoint = {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  auth: "public" | "cron-secret" | "bot-token" | "supabase-auth";
  description: string;
  file: string;
};

export type RouteEntry = {
  path: string;
  file: string;
  access: "public" | "auth" | "admin";
  description: string;
};

export type ServerFn = {
  name: string;
  file: string;
  description: string;
};

export type TableEntry = {
  name: string;
  purpose: string;
  rls: string;
};

export type Feature = {
  id: string;
  title: string;
  description: string;
  routes: string[];
  tables: string[];
  files: string[];
};

export const STACK = {
  runtime: "Cloudflare Workers (workerd) + nodejs_compat",
  framework: "TanStack Start v1 (React 19, SSR)",
  router: "TanStack Router v1 (file-based routing em src/routes/)",
  bundler: "Vite 7",
  styling: "Tailwind CSS v4 (tokens semânticos via src/styles.css)",
  ui: "shadcn/ui + Radix UI + Framer Motion",
  data: "TanStack Query v5 (staleTime custom por rota)",
  backend: "Supabase (Postgres + Auth + Storage + Realtime + pg_cron)",
  auth: "Supabase Auth (email/senha + Google OAuth)",
  ai: "Lovable AI Gateway (blog automation)",
  scraping: "Firecrawl (@mendable/firecrawl-js) + LLM parsers",
  pwa: "Service Worker próprio (public/sw.js) + offline shell",
  push: "Web Push API + FCM (VAPID)",
  pdf: "html2pdf.js + html2canvas",
  forms: "react-hook-form + zod",
  deploy: "Lovable Cloud (workers) | preview + prod URLs estáveis",
};

export const CONVENTIONS = [
  "Rotas em src/routes/ (dot-separated, ex: admin.push.novo.tsx = /admin/push/novo).",
  "__root.tsx é o único layout raiz. Layouts intermediários usam <Outlet />.",
  "createFileRoute('...') deve casar exatamente com o arquivo (incluindo _authenticated).",
  "Server functions com createServerFn em *.functions.ts (client-safe).",
  "Server routes HTTP em src/routes/api/public/* (externo) — auth via header dedicado.",
  "Nunca importar client.server.ts em módulo top-level de *.functions.ts. Sempre dentro do handler.",
  "process.env é lido DENTRO do handler (Workers injetam env por request).",
  "Todas as tabelas em public.* possuem RLS habilitado + GRANT explícito.",
  "Roles ficam em user_roles (não em profiles). has_role() é SECURITY DEFINER.",
  "Tokens semânticos Tailwind: bg-primary, bg-card, text-foreground. Nunca hex/cores fixas.",
];

export const FEATURES: Feature[] = [
  {
    id: "empresas",
    title: "Diretório de Empresas",
    description:
      "Catálogo local com perfis premium, categorias, mídia, FAQs, projetos, avaliações, favoritos, mensagens e leads (formulário de cotação). Toggle Destaque/Premium via admin.",
    routes: ["/buscar", "/empresa/$slug", "/categoria/$slug", "/admin/empresas", "/painel/empresas"],
    tables: [
      "companies", "categories", "company_categories", "company_media",
      "company_faqs", "company_projects", "company_views", "favorites",
      "listing_messages", "leads", "reviews",
    ],
    files: ["src/routes/empresa.$slug.tsx", "src/components/site/CompanyCard.tsx"],
  },
  {
    id: "empregos",
    title: "Portal de Empregos (Indeed-like)",
    description:
      "Listagem com filtros avançados (remoto, salário, experiência, cidade), vagas Premium destacadas, sincronização por fontes externas via cron (jobs-sync).",
    routes: ["/empregos", "/empregos/$id", "/empregos/premium", "/admin/empregos"],
    tables: ["jobs", "job_sources", "job_sync_logs"],
    files: ["src/features/jobs/*", "src/lib/jobs.functions.ts", "src/lib/jobs-sync.server.ts"],
  },
  {
    id: "eventos",
    title: "Eventos & Shows",
    description: "Agenda cultural com scraper TripAdvisor e categorização.",
    routes: ["/eventos", "/eventos/$slug", "/admin/eventos"],
    tables: ["events", "event_categories", "event_sync_logs", "shows"],
    files: ["src/lib/events-scrape.server.ts"],
  },
  {
    id: "turismo",
    title: "Turismo & Roteiros",
    description: "Atrações turísticas com roteiro de 2 dias (cavernas, gastronomia, ecoturismo).",
    routes: ["/roteiro-turistico", "/o-que-fazer", "/admin/turismo"],
    tables: ["tourist_attractions"],
    files: ["src/routes/roteiro-turistico.tsx"],
  },
  {
    id: "servicos-publicos",
    title: "Serviços Públicos & Emergência",
    description: "Telefones úteis, órgãos e emergência (scrapers Vespasiano/SJL via Firecrawl+LLM).",
    routes: ["/servicos-publicos", "/emergencia", "/vespasiano", "/admin/servicos-publicos", "/admin/scraper-vespasiano", "/admin/scraper-sjl"],
    tables: ["public_services", "emergency_contacts", "cities"],
    files: ["src/lib/services-scrape.server.ts", "src/lib/scrape-vespasiano.functions.ts", "src/lib/scrape-sjl.functions.ts"],
  },
  {
    id: "transporte",
    title: "Transporte Metropolitano",
    description: "Linhas de ônibus com horários (scraper próprio).",
    routes: ["/transporte", "/transporte/linhas"],
    tables: ["bus_lines", "bus_sync_logs"],
    files: ["src/lib/bus-scrape.server.ts"],
  },
  {
    id: "representantes",
    title: "Transparência Legislativa",
    description: "Parlamentares, atividades, presença e ranking (scraper Câmara).",
    routes: ["/representantes", "/representantes/$id", "/representantes/feed", "/representantes/ranking", "/transparencia"],
    tables: ["representatives", "representative_activities", "representative_attendance", "representative_sync_logs"],
    files: ["src/lib/representatives-scrape.server.ts", "src/lib/scrape-camara-sjl.functions.ts"],
  },
  {
    id: "blog",
    title: "Blog & Notícias",
    description: "31 posts iniciais + geração diária automática via cron + Lovable AI. JSON-LD Article, sitemap dinâmico.",
    routes: ["/blog", "/blog/$slug", "/admin/blog", "/admin/blog-ai"],
    tables: ["posts", "post_categories", "blog_categories", "blog_posts_legacy"],
    files: ["src/lib/blog-ai.functions.ts", "src/routes/api/public/hooks/daily-blog-post.ts"],
  },
  {
    id: "promocoes",
    title: "Promoções & Cupons",
    description: "Cupons de desconto com limite via plano Premium, notificações push segmentadas, banner na home.",
    routes: ["/promocoes", "/painel/promocoes", "/admin/promocoes"],
    tables: ["promotions", "coupons"],
    files: ["src/lib/promocoes.ts", "src/lib/promocoes-notify.functions.ts"],
  },
  {
    id: "marketplace",
    title: "Marketplace (classificados)",
    description: "Itens/anúncios com listagens, denúncias e mensagens.",
    routes: ["/marketplace", "/marketplace/$slug"],
    tables: ["marketplace_items", "listings", "listing_categories", "listing_messages", "listing_reports"],
    files: ["src/lib/marketplace.ts"],
  },
  {
    id: "anuncios",
    title: "Anúncios Locais + Analytics",
    description: "Banners/Ads com rastreamento de impressões/cliques, dashboard e exportação PDF.",
    routes: ["/admin/anuncios", "/admin/analytics-anuncios"],
    tables: ["ad_campaigns", "banners", "analytics_events"],
    files: ["src/components/site/AdModal.tsx"],
  },
  {
    id: "live-feed",
    title: "Ao Vivo (Realtime)",
    description: "Feed em tempo real (Supabase Realtime) do que está acontecendo agora.",
    routes: ["/ao-vivo", "/agora", "/admin/ao-vivo"],
    tables: ["live_feed_hidden"],
    files: ["src/features/live-feed/*"],
  },
  {
    id: "push",
    title: "Notificações Push (Web Push)",
    description: "Assinatura via SW, envio segmentado, templates, agendamento e retry automático via cron.",
    routes: ["/admin/push", "/admin/push/novo", "/admin/push/templates", "/admin/push/historico", "/painel/notificacoes"],
    tables: ["push_subscriptions", "push_notifications", "push_deliveries", "push_inbox", "notification_preferences", "notification_templates", "notifications"],
    files: ["src/lib/push-dispatch.server.ts", "src/lib/push-send.server.ts", "public/sw.js"],
  },
  {
    id: "whatsapp",
    title: "WhatsApp Digest Semanal",
    description: "Bot Node externo (whatsapp-bot/) envia digest todas as sextas 15:00 UTC. Opt-out via SAIR.",
    routes: ["/api/public/hooks/whatsapp-weekly-digest", "/api/public/hooks/whatsapp-opt-out"],
    tables: ["whatsapp_subscribers"],
    files: ["src/lib/whatsapp-weekly-digest.server.ts", "whatsapp-bot/src/*"],
  },
  {
    id: "qa",
    title: "Central de Qualidade (bugs)",
    description: "Coleta bug reports com screenshots, comentários e eventos.",
    routes: ["/admin/qa"],
    tables: ["qa_tickets", "qa_ticket_comments", "qa_ticket_events"],
    files: ["src/lib/qa.functions.ts", "src/components/qa/BugReportButton.tsx"],
  },
  {
    id: "solicitacoes",
    title: "Solicitações & Pedidos",
    description: "Formulário global (SOL-000001) com status e tratativa no admin.",
    routes: ["/admin/solicitacoes"],
    tables: ["user_requests"],
    files: ["src/lib/user-requests.functions.ts", "src/components/site/RequestFormButton.tsx"],
  },
  {
    id: "backup",
    title: "Backup & Restauração",
    description: "Export JSON/SQL de 29 tabelas, restore via RPC admin_restore_table_tx (transacional).",
    routes: ["/admin/backup"],
    tables: ["*"],
    files: ["src/lib/admin-backup.functions.ts"],
  },
  {
    id: "planos",
    title: "Planos & Assinaturas",
    description: "Configuração de planos, limites por plano, upsell premium.",
    routes: ["/planos", "/admin/planos"],
    tables: ["plans_config", "leads_planos"],
    files: ["src/lib/plans.ts"],
  },
  {
    id: "onboarding",
    title: "Onboarding de Comerciantes",
    description: "Wizard 4+ passos rastreado em profiles.onboarding_completed_at.",
    routes: ["/painel", "/painel/perfil"],
    tables: ["profiles"],
    files: ["src/components/panel/PanelOnboardingWizard.tsx"],
  },
  {
    id: "pwa",
    title: "PWA & Offline",
    description: "Service Worker próprio, cache de shell, tela offline, install prompt, vibração/áudio Android.",
    routes: ["/"],
    tables: [],
    files: ["public/sw.js", "public/offline.html", "public/manifest.webmanifest", "src/lib/pwa.ts"],
  },
  {
    id: "transicoes",
    title: "Transições de Página",
    description: "15 presets configuráveis via admin (fade/slide/scale/blur).",
    routes: ["/admin/transicoes"],
    tables: ["system_settings"],
    files: ["src/lib/page-transition-config.ts", "src/components/site/PageTransition.tsx"],
  },
  {
    id: "shopee",
    title: "Ofertas Shopee (Afiliados)",
    description:
      "Catálogo de 10.000 produtos importados via CSV do datafeed de afiliados (Shopee). Widget de destaques na home (top 24 por desconto + rating), página pública com busca/filtros/ordenação/paginação, links usam product_short_link com rel='noopener sponsored nofollow'. Página admin lista URLs dos datafeeds para re-download manual.",
    routes: ["/ofertas-shopee", "/admin/shopee-feeds"],
    tables: ["shopee_products"],
    files: [
      "src/lib/shopeeProducts.ts",
      "src/components/site/ShopeeProductCard.tsx",
      "src/components/site/ShopeeFeaturedWidget.tsx",
      "src/routes/ofertas-shopee.tsx",
      "src/routes/admin.shopee-feeds.tsx",
    ],
  },
  {
    id: "reivindicacoes",
    title: "Reivindicação de Empresa",
    description:
      "Usuário reivindica propriedade de uma empresa não reclamada; anexa evidência no bucket claim-evidence; admin revisa em /admin/reivindicacoes; aprovação transfere owner_id via trigger company_claims_on_review e dispara notificação in-app.",
    routes: ["/admin/reivindicacoes", "/painel/reivindicacoes"],
    tables: ["company_claims"],
    files: [
      "src/lib/company-claims.functions.ts",
      "src/components/site/ClaimCompanyButton.tsx",
      "src/components/site/ClaimCompanyDialog.tsx",
    ],
  },
];

/**
 * Arquitetura em camadas (leitura obrigatória para novos devs).
 *
 * 1) UI (src/components + src/routes)
 *    - Componentes usam apenas tokens semânticos Tailwind e shadcn/ui.
 *    - Rotas ficam em src/routes/ com file-based routing (dots = slashes).
 *    - __root.tsx aplica providers globais: QueryClientProvider, ThemeProvider,
 *      Toaster, PageTransition, error boundary.
 *
 * 2) Data fetching (TanStack Query)
 *    - Toda leitura passa por queryKey estável (ver src/features/[feature]/queries.ts).
 *    - Realtime: hooks assinam canais Supabase e chamam invalidateQueries.
 *    - staleTime por rota evita over-fetch em SSR + client.
 *
 * 3) Server functions (createServerFn) e Server routes
 *    - App-internal → *.functions.ts com createServerFn (RPC tipado).
 *    - Webhooks/cron/externos → src/routes/api/public/* (HTTP puro).
 *    - Cron protegido por header x-cron-secret (checkCronAuth em cron-auth.server.ts).
 *
 * 4) Persistência (Supabase)
 *    - RLS habilitado em 100% das tabelas em public.*.
 *    - Roles em user_roles + função has_role() SECURITY DEFINER (evita recursão).
 *    - Triggers para: onboarding admin automático, notificações admin,
 *      reindexação de rating, limites de plano (promotions), auditoria QA.
 *
 * 5) Integrações externas
 *    - Firecrawl (scrapers de sites municipais e câmara).
 *    - Lovable AI Gateway (geração diária de blog).
 *    - Web Push + FCM via VAPID (public/sw.js).
 *    - WhatsApp bot standalone (whatsapp-bot/, Node local, opt-out via /api/public/hooks/whatsapp-opt-out).
 *    - Shopee Afiliados (datafeed CSV, importado via COPY no Postgres).
 */
export const ARCHITECTURE_NOTES = [
  "SSR: loaders isomórficos usam ensureQueryData; código server-only fica em *.server.ts e é dynamic-imported dentro do handler.",
  "Nunca fazer fetch manual para .url de server function — sempre chamar via useServerFn ou import direto.",
  "process.env é lido dentro do handler; import.meta.env.VITE_* no browser.",
  "Segredos (SERVICE_ROLE, CRON_SECRET, VAPID_PRIVATE) só existem no runtime server.",
  "Escrita de tabela pública: sempre precedida de GRANT explícito na mesma migration.",
  "Client-side: cn() de @/lib/utils para classes condicionais; nunca cores hex/hard-coded.",
];

export const API_ENDPOINTS: ApiEndpoint[] = [
  { path: "/api/public/hooks/jobs-sync", method: "POST", auth: "cron-secret", description: "Roda fontes de vagas vencidas.", file: "src/routes/api/public/hooks/jobs-sync.ts" },
  { path: "/api/public/hooks/push-scheduler", method: "POST", auth: "cron-secret", description: "Processa push agendado + retry falhas.", file: "src/routes/api/public/hooks/push-scheduler.ts" },
  { path: "/api/public/hooks/scrape-events", method: "POST", auth: "cron-secret", description: "Scraper de eventos (TripAdvisor).", file: "src/routes/api/public/hooks/scrape-events.ts" },
  { path: "/api/public/hooks/scrape-services", method: "POST", auth: "cron-secret", description: "Scraper de serviços públicos.", file: "src/routes/api/public/hooks/scrape-services.ts" },
  { path: "/api/public/hooks/scrape-procurements", method: "POST", auth: "cron-secret", description: "Scraper de licitações.", file: "src/routes/api/public/hooks/scrape-procurements.ts" },
  { path: "/api/public/hooks/sync-bus", method: "POST", auth: "cron-secret", description: "Scraper de linhas de ônibus.", file: "src/routes/api/public/hooks/sync-bus.ts" },
  { path: "/api/public/hooks/sync-representatives", method: "POST", auth: "cron-secret", description: "Scraper Câmara/Executivo.", file: "src/routes/api/public/hooks/sync-representatives.ts" },
  { path: "/api/public/hooks/daily-blog-post", method: "POST", auth: "cron-secret", description: "Gera post diário via Lovable AI.", file: "src/routes/api/public/hooks/daily-blog-post.ts" },
  { path: "/api/public/hooks/whatsapp-weekly-digest", method: "POST", auth: "cron-secret", description: "Envia digest semanal (sexta 15:00 UTC).", file: "src/routes/api/public/hooks/whatsapp-weekly-digest.ts" },
  { path: "/api/public/hooks/whatsapp-opt-out", method: "POST", auth: "bot-token", description: "Opt-out via bot WhatsApp.", file: "src/routes/api/public/hooks/whatsapp-opt-out.ts" },
  { path: "/api/public/hooks/sync-original", method: "POST", auth: "cron-secret", description: "Sincronizações legadas agrupadas.", file: "src/routes/api/public/hooks/sync-original.ts" },
  { path: "/api/public/push/resubscribe", method: "POST", auth: "public", description: "Renova subscription push expirada.", file: "src/routes/api/public/push/resubscribe.ts" },
  { path: "/api/public/push/track", method: "POST", auth: "public", description: "Rastreia entrega/clique push (beacon).", file: "src/routes/api/public/push/track.ts" },
  { path: "/sitemap.xml", method: "GET", auth: "public", description: "Sitemap dinâmico.", file: "src/routes/sitemap[.]xml.ts" },
];

export const SERVER_FUNCTIONS: ServerFn[] = [
  { name: "admin-backup", file: "src/lib/admin-backup.functions.ts", description: "Export/import de 29 tabelas via URL assinada + RPC transacional." },
  { name: "admin-jobs", file: "src/lib/admin-jobs.functions.ts", description: "CRUD e sync manual de vagas Premium." },
  { name: "admin-push", file: "src/lib/admin-push.functions.ts", description: "Envio, agendamento e templates de push." },
  { name: "blog-ai", file: "src/lib/blog-ai.functions.ts", description: "Geração de posts via Lovable AI (título+corpo+SEO)." },
  { name: "cityDetect", file: "src/lib/cityDetect.functions.ts", description: "Detecção automática de cidade por geolocalização/IP." },
  { name: "duplicates", file: "src/lib/duplicates.functions.ts", description: "Detecção de conteúdo duplicado." },
  { name: "jobs", file: "src/lib/jobs.functions.ts", description: "Busca paginada com filtros Indeed-like." },
  { name: "procurements", file: "src/lib/procurements.functions.ts", description: "Listagem de licitações." },
  { name: "promocoes-notify", file: "src/lib/promocoes-notify.functions.ts", description: "Push segmentado para nova promoção." },
  { name: "push", file: "src/lib/push.functions.ts", description: "Subscribe/unsubscribe/preferências." },
  { name: "qa", file: "src/lib/qa.functions.ts", description: "CRUD tickets bugs + upload attachments." },
  { name: "scrape-*", file: "src/lib/scrape-*.functions.ts", description: "Scrapers manuais (Vespasiano, SJL, Câmara)." },
  { name: "user-requests", file: "src/lib/user-requests.functions.ts", description: "Criação e tratativa de solicitações." },
  { name: "whatsapp-subscribe", file: "src/lib/whatsapp-subscribe.functions.ts", description: "Inscrição no digest semanal." },
];

export const TABLES: TableEntry[] = [
  { name: "companies", purpose: "Perfis de empresas locais.", rls: "SELECT público; UPDATE dono; ALL admin." },
  { name: "categories", purpose: "Categorias globais.", rls: "SELECT público; ALL admin." },
  { name: "company_categories", purpose: "M2M empresa↔categoria.", rls: "SELECT público." },
  { name: "company_media / company_faqs / company_projects", purpose: "Dados ricos do perfil.", rls: "SELECT público; UPDATE dono." },
  { name: "company_views", purpose: "Métricas de visualização.", rls: "INSERT anon; SELECT admin." },
  { name: "reviews", purpose: "Avaliações.", rls: "SELECT restrito (privacidade); INSERT autenticado." },
  { name: "favorites", purpose: "Favoritos por usuário.", rls: "auth.uid()." },
  { name: "leads", purpose: "Cotações via formulário.", rls: "INSERT público; SELECT dono empresa+admin." },
  { name: "listings / listing_categories / listing_messages / listing_reports", purpose: "Marketplace.", rls: "SELECT público; INSERT autenticado." },
  { name: "jobs / job_sources / job_sync_logs", purpose: "Portal empregos.", rls: "SELECT público; ALL admin." },
  { name: "events / event_categories / event_sync_logs / shows", purpose: "Eventos.", rls: "SELECT público." },
  { name: "tourist_attractions", purpose: "Atrações turísticas.", rls: "SELECT público; ALL admin." },
  { name: "public_services / emergency_contacts", purpose: "Serviços públicos & emergência.", rls: "SELECT público; ALL admin." },
  { name: "cities", purpose: "Configuração por cidade.", rls: "SELECT público." },
  { name: "bus_lines / bus_sync_logs", purpose: "Transporte metropolitano.", rls: "SELECT público." },
  { name: "representatives / representative_activities / representative_attendance", purpose: "Transparência legislativa.", rls: "SELECT público." },
  { name: "posts / post_categories / blog_categories", purpose: "Blog & Notícias.", rls: "SELECT publicado; ALL admin." },
  { name: "promotions / coupons", purpose: "Promoções & cupons.", rls: "SELECT ativos; UPDATE dono." },
  { name: "ad_campaigns / banners / analytics_events", purpose: "Ads + analytics.", rls: "SELECT público (banners); INSERT anon (events)." },
  { name: "push_subscriptions / push_notifications / push_deliveries / push_inbox", purpose: "Push stack.", rls: "auth.uid() + admin." },
  { name: "notification_preferences / notification_templates / notifications", purpose: "Preferências e templates.", rls: "auth.uid() + admin." },
  { name: "whatsapp_subscribers", purpose: "Assinantes WhatsApp.", rls: "admin only." },
  { name: "qa_tickets / qa_ticket_comments / qa_ticket_events", purpose: "Central Qualidade.", rls: "autor + admin." },
  { name: "user_requests", purpose: "Solicitações globais.", rls: "autor + admin." },
  { name: "profiles", purpose: "Perfil do usuário (sem role).", rls: "SELECT restrito; UPDATE dono." },
  { name: "user_roles", purpose: "Roles (admin/user).", rls: "SELECT via has_role() SECURITY DEFINER." },
  { name: "plans_config / leads_planos", purpose: "Planos e leads de upsell.", rls: "SELECT público; ALL admin." },
  { name: "system_settings", purpose: "Config chave-valor (nav, transições).", rls: "SELECT is_public; ALL admin." },
  { name: "newsletter_subscribers / banners / procurements", purpose: "Outros conteúdos.", rls: "SELECT público." },
  { name: "shopee_products", purpose: "Catálogo Shopee Afiliados (10k linhas, indexes por categoria/desconto/rating/fts).", rls: "SELECT público; ALL admin." },
  { name: "company_claims", purpose: "Reivindicações de empresas com evidência em Storage.", rls: "INSERT autenticado; SELECT dono+admin; UPDATE admin." },
];

export const ADMIN_ROUTES: RouteEntry[] = [
  { path: "/admin", file: "src/routes/admin.index.tsx", access: "admin", description: "Dashboard." },
  { path: "/admin/empresas", file: "src/routes/admin.empresas.tsx", access: "admin", description: "CRUD empresas + toggle Destaque/Premium." },
  { path: "/admin/cidades", file: "src/routes/admin.cidades.tsx", access: "admin", description: "Configuração de cidades." },
  { path: "/admin/servicos-publicos", file: "src/routes/admin.servicos-publicos.tsx", access: "admin", description: "Serviços públicos." },
  { path: "/admin/emergencia", file: "src/routes/admin.emergencia.tsx", access: "admin", description: "Contatos emergência." },
  { path: "/admin/scraper-vespasiano", file: "src/routes/admin.scraper-vespasiano.tsx", access: "admin", description: "Scraper Vespasiano." },
  { path: "/admin/scraper-sjl", file: "src/routes/admin.scraper-sjl.tsx", access: "admin", description: "Scraper SJL." },
  { path: "/admin/scraper-camara-sjl", file: "src/routes/admin.scraper-camara-sjl.tsx", access: "admin", description: "Scraper Câmara SJL." },
  { path: "/admin/planos", file: "src/routes/admin.planos.tsx", access: "admin", description: "Planos e limites." },
  { path: "/admin/leads", file: "src/routes/admin.leads.tsx", access: "admin", description: "Leads recebidos." },
  { path: "/admin/eventos", file: "src/routes/admin.eventos.tsx", access: "admin", description: "Eventos." },
  { path: "/admin/empregos", file: "src/routes/admin.empregos.tsx", access: "admin", description: "Vagas." },
  { path: "/admin/turismo", file: "src/routes/admin.turismo.tsx", access: "admin", description: "Atrações turísticas." },
  { path: "/admin/blog", file: "src/routes/admin.blog.tsx", access: "admin", description: "Blog CRUD." },
  { path: "/admin/blog-ai", file: "src/routes/admin.blog-ai.tsx", access: "admin", description: "Gerador IA de posts." },
  { path: "/admin/duplicados", file: "src/routes/admin.duplicados.tsx", access: "admin", description: "Conteúdo duplicado." },
  { path: "/admin/calendario-editorial", file: "src/routes/admin.calendario-editorial.tsx", access: "admin", description: "Calendário editorial." },
  { path: "/admin/promocoes", file: "src/routes/admin.promocoes.tsx", access: "admin", description: "Promoções & cupons." },
  { path: "/admin/anuncios", file: "src/routes/admin.anuncios.tsx", access: "admin", description: "Anúncios locais." },
  { path: "/admin/analytics-anuncios", file: "src/routes/admin.analytics-anuncios.tsx", access: "admin", description: "Analytics de ads + PDF export." },
  { path: "/admin/push", file: "src/routes/admin.push.tsx", access: "admin", description: "Push (layout)." },
  { path: "/admin/push/novo", file: "src/routes/admin.push.novo.tsx", access: "admin", description: "Nova notificação." },
  { path: "/admin/push/templates", file: "src/routes/admin.push.templates.tsx", access: "admin", description: "Templates push." },
  { path: "/admin/push/historico", file: "src/routes/admin.push.historico.tsx", access: "admin", description: "Histórico envios." },
  { path: "/admin/menu", file: "src/routes/admin.menu.tsx", access: "admin", description: "Config menu do site." },
  { path: "/admin/textos", file: "src/routes/admin.textos.tsx", access: "admin", description: "Textos do site." },
  { path: "/admin/qa", file: "src/routes/admin.qa.tsx", access: "admin", description: "Central Qualidade." },
  { path: "/admin/solicitacoes", file: "src/routes/admin.solicitacoes.tsx", access: "admin", description: "Solicitações & pedidos." },
  { path: "/admin/ao-vivo", file: "src/routes/admin.ao-vivo.tsx", access: "admin", description: "Feed Ao Vivo moderação." },
  { path: "/admin/backup", file: "src/routes/admin.backup.tsx", access: "admin", description: "Backup & restauração." },
  { path: "/admin/transicoes", file: "src/routes/admin.transicoes.tsx", access: "admin", description: "Transições de página." },
  { path: "/admin/configuracoes", file: "src/routes/admin.configuracoes.tsx", access: "admin", description: "Configurações gerais." },
  { path: "/admin/documentacao", file: "src/routes/admin.documentacao.tsx", access: "admin", description: "Documentação técnica (esta página)." },
  { path: "/admin/shopee-feeds", file: "src/routes/admin.shopee-feeds.tsx", access: "admin", description: "URLs dos datafeeds Shopee para download manual." },
  { path: "/admin/reivindicacoes", file: "src/routes/admin.reivindicacoes.tsx", access: "admin", description: "Reivindicações de empresa (aprovar/rejeitar)." },
];

export const PUBLIC_ROUTES: RouteEntry[] = [
  { path: "/", file: "src/routes/index.tsx", access: "public", description: "Home." },
  { path: "/auth", file: "src/routes/auth.tsx", access: "public", description: "Login (email + Google)." },
  { path: "/reset-password", file: "src/routes/reset-password.tsx", access: "public", description: "Reset senha." },
  { path: "/sobre", file: "src/routes/sobre.tsx", access: "public", description: "Sobre." },
  { path: "/contato", file: "src/routes/contato.tsx", access: "public", description: "Contato." },
  { path: "/planos", file: "src/routes/planos.tsx", access: "public", description: "Planos." },
  { path: "/reputacao", file: "src/routes/reputacao.tsx", access: "public", description: "Reputação." },
  { path: "/agora", file: "src/routes/agora.tsx", access: "public", description: "Agora (widget realtime)." },
  { path: "/ao-vivo", file: "src/routes/ao-vivo.tsx", access: "public", description: "Feed Ao Vivo." },
  { path: "/buscar", file: "src/routes/buscar.tsx", access: "public", description: "Busca empresas." },
  { path: "/categoria/$slug", file: "src/routes/categoria.$slug.tsx", access: "public", description: "Categoria." },
  { path: "/empresa/$slug", file: "src/routes/empresa.$slug.tsx", access: "public", description: "Perfil empresa (LocalBusiness+FAQ JSON-LD)." },
  { path: "/cidades/$slug", file: "src/routes/cidades.$slug.tsx", access: "public", description: "Página cidade." },
  { path: "/vespasiano", file: "src/routes/vespasiano.tsx", access: "public", description: "Landing Vespasiano." },
  { path: "/eventos", file: "src/routes/eventos.index.tsx", access: "public", description: "Eventos." },
  { path: "/eventos/$slug", file: "src/routes/eventos.$slug.tsx", access: "public", description: "Detalhe evento." },
  { path: "/empregos", file: "src/routes/empregos.tsx", access: "public", description: "Empregos." },
  { path: "/empregos/premium", file: "src/routes/empregos.premium.tsx", access: "public", description: "Vagas premium." },
  { path: "/empregos/$id", file: "src/routes/empregos.$id.tsx", access: "public", description: "Detalhe vaga." },
  { path: "/o-que-fazer", file: "src/routes/o-que-fazer.tsx", access: "public", description: "O que fazer." },
  { path: "/roteiro-turistico", file: "src/routes/roteiro-turistico.tsx", access: "public", description: "Roteiro 2 dias." },
  { path: "/marketplace", file: "src/routes/marketplace.tsx", access: "public", description: "Marketplace." },
  { path: "/marketplace/$slug", file: "src/routes/marketplace.$slug.tsx", access: "public", description: "Item marketplace." },
  { path: "/transporte", file: "src/routes/transporte.tsx", access: "public", description: "Transporte." },
  { path: "/transporte/linhas", file: "src/routes/transporte.linhas.tsx", access: "public", description: "Linhas ônibus." },
  { path: "/representantes", file: "src/routes/representantes.index.tsx", access: "public", description: "Representantes." },
  { path: "/representantes/$id", file: "src/routes/representantes.$id.tsx", access: "public", description: "Perfil parlamentar." },
  { path: "/representantes/feed", file: "src/routes/representantes.feed.tsx", access: "public", description: "Feed atividades." },
  { path: "/representantes/ranking", file: "src/routes/representantes.ranking.tsx", access: "public", description: "Ranking." },
  { path: "/transparencia", file: "src/routes/transparencia.tsx", access: "public", description: "Transparência." },
  { path: "/servicos-publicos", file: "src/routes/servicos-publicos.tsx", access: "public", description: "Serviços públicos." },
  { path: "/emergencia", file: "src/routes/emergencia.tsx", access: "public", description: "Emergência." },
  { path: "/blog", file: "src/routes/blog.index.tsx", access: "public", description: "Blog (categorias + filtros)." },
  { path: "/blog/$slug", file: "src/routes/blog.$slug.tsx", access: "public", description: "Post." },
  { path: "/promocoes", file: "src/routes/promocoes.tsx", access: "public", description: "Promoções." },
  { path: "/favoritos", file: "src/routes/favoritos.tsx", access: "public", description: "Favoritos." },
  { path: "/ofertas-shopee", file: "src/routes/ofertas-shopee.tsx", access: "public", description: "Catálogo Shopee (busca+filtros+paginação)." },
];

export const PANEL_ROUTES: RouteEntry[] = [
  { path: "/painel", file: "src/routes/painel.tsx", access: "auth", description: "Layout do painel do usuário." },
  { path: "/painel", file: "src/routes/painel.index.tsx", access: "auth", description: "Dashboard usuário + onboarding wizard." },
  { path: "/painel/perfil", file: "src/routes/painel.perfil.tsx", access: "auth", description: "Perfil + logout." },
  { path: "/painel/empresas", file: "src/routes/painel.empresas.tsx", access: "auth", description: "Minhas empresas." },
  { path: "/painel/empresas/nova", file: "src/routes/painel.empresas.nova.tsx", access: "auth", description: "Nova empresa." },
  { path: "/painel/empresas/$id", file: "src/routes/painel.empresas.$id.tsx", access: "auth", description: "Editar empresa." },
  { path: "/painel/anuncios", file: "src/routes/painel.anuncios.tsx", access: "auth", description: "Anúncios." },
  { path: "/painel/anuncios/novo", file: "src/routes/painel.anuncios.novo.tsx", access: "auth", description: "Novo anúncio." },
  { path: "/painel/anuncios/$id/editar", file: "src/routes/painel.anuncios.$id.editar.tsx", access: "auth", description: "Editar anúncio." },
  { path: "/painel/leads", file: "src/routes/painel.leads.tsx", access: "auth", description: "Leads recebidos." },
  { path: "/painel/avaliacoes", file: "src/routes/painel.avaliacoes.tsx", access: "auth", description: "Avaliações." },
  { path: "/painel/mensagens", file: "src/routes/painel.mensagens.tsx", access: "auth", description: "Mensagens." },
  { path: "/painel/promocoes", file: "src/routes/painel.promocoes.tsx", access: "auth", description: "Promoções." },
  { path: "/painel/notificacoes", file: "src/routes/painel.notificacoes.tsx", access: "auth", description: "Notificações." },
  { path: "/painel/notificacoes/preferencias", file: "src/routes/painel.notificacoes.preferencias.tsx", access: "auth", description: "Preferências push." },
  { path: "/painel/favoritos", file: "src/routes/painel.favoritos.tsx", access: "auth", description: "Favoritos." },
  { path: "/painel/ranking", file: "src/routes/painel.ranking.tsx", access: "auth", description: "Ranking." },
  { path: "/painel/reivindicacoes", file: "src/routes/painel.reivindicacoes.tsx", access: "auth", description: "Minhas reivindicações de empresa." },
];

export const ENV_VARS = {
  browser: [
    "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PROJECT_ID",
  ],
  server: [
    "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY (não disponível em Lovable Cloud)",
    "CRON_SECRET (proteção /api/public/hooks/*)",
    "WHATSAPP_BOT_TOKEN (opt-out bot)",
    "FIRECRAWL_API_KEY (scrapers)",
    "LOVABLE_API_KEY (AI Gateway blog)",
    "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY (push)",
  ],
};

export const CLONE_STEPS = [
  "1. Criar projeto Supabase e habilitar Google OAuth + email/senha.",
  "2. Rodar as migrations em ordem cronológica (supabase/migrations).",
  "3. Configurar user_roles + trigger para admin (fjuvespasiano@gmail.com, williamiurd.ramos@gmail.com).",
  "4. Criar buckets Storage: company-media, promotions, qa-attachments, backups.",
  "5. Configurar cron jobs (pg_cron) para /api/public/hooks/* usando header x-cron-secret.",
  "6. Preencher .env com SUPABASE_URL, chaves e secrets (VAPID, CRON_SECRET, FIRECRAWL, LOVABLE_API_KEY).",
  "7. bun install; bun run dev.",
  "8. Deploy: Cloudflare Workers (workerd + nodejs_compat) OU Vercel Edge.",
  "9. Publicar SW (public/sw.js) e manifest.webmanifest — HTTPS obrigatório para push.",
  "10. Rodar seeds iniciais (cidades, categorias, plans_config, blog posts).",
];

import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Search, MapPin, SlidersHorizontal, Star, X, Loader2, Crown, ArrowUpDown, Filter } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CompanyCard, toCompanyCardData } from "@/components/site/CompanyCard";
import { CategoryIcon } from "@/components/site/CategoryIcon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { categoriesQueryOptions, citiesQueryOptions, searchCompanies, suggestCompanies } from "@/lib/queries";

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(["relevance", "rating", "name", "newest"]).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  premium: z.coerce.boolean().optional(),
  plan: z.enum(["all", "free", "premium", "featured"]).optional(),
});

const PAGE_SIZE = 12;

export const Route = createFileRoute("/buscar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Buscar serviços e empresas — AgendaAqui" },
      { name: "description", content: "Encontre empresas verificadas por categoria, cidade, avaliação e preço. Autocomplete, filtros dinâmicos e resultados em cards." },
      { property: "og:url", content: "/buscar" },
    ],
    links: [{ rel: "canonical", href: "/buscar" }],
  }),
  component: BuscarPage,
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(categoriesQueryOptions);
    void context.queryClient.prefetchQuery(citiesQueryOptions);
  },
});

function BuscarPage() {
  const search = Route.useSearch();
  const { q, city, category, sort = "relevance", minRating = 0, premium = false, plan = "all" } = search;
  const navigate = useNavigate();

  const cats = useQuery(categoriesQueryOptions);
  const cities = useQuery(citiesQueryOptions);

  const results = useInfiniteQuery({
    queryKey: ["search-inf", q ?? "", city ?? "", category ?? "", sort, minRating, premium, plan],
    queryFn: ({ pageParam }) =>
      searchCompanies({ q, city, category, sort, minRating, premiumOnly: premium, plan, page: pageParam as number, limit: PAGE_SIZE }),
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
    initialPageParam: 0,
  });

  const items = useMemo(() => results.data?.pages.flatMap((p) => p.items) ?? [], [results.data]);
  const total = results.data?.pages[0]?.total ?? null;

  function setParam<K extends keyof typeof search>(k: K, v: typeof search[K]) {
    navigate({ to: "/buscar", search: { ...search, [k]: v } });
  }
  function clearAll() {
    navigate({ to: "/buscar", search: {} });
  }

  const activeChips = [
    q ? { label: `"${q}"`, onClear: () => setParam("q", undefined) } : null,
    city ? { label: cities.data?.find((c) => c.slug === city)?.name ?? city, onClear: () => setParam("city", undefined) } : null,
    category ? { label: cats.data?.find((c) => c.slug === category)?.name ?? category, onClear: () => setParam("category", undefined) } : null,
    plan !== "all" ? { label: plan === "featured" ? "Destaque" : plan === "premium" ? "Premium" : "Grátis", onClear: () => setParam("plan", undefined) } : null,
    minRating > 0 ? { label: `${minRating}+ estrelas`, onClear: () => setParam("minRating", undefined) } : null,
    premium ? { label: "Somente Premium", onClear: () => setParam("premium", undefined) } : null,
  ].filter(Boolean) as { label: string; onClear: () => void }[];

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && results.hasNextPage && !results.isFetchingNextPage) {
        results.fetchNextPage();
      }
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [results]);

  return (
    <SiteLayout>
      {/* Sticky search hero */}
      <section className="sticky top-16 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container mx-auto px-4 py-4">
          <SmartSearchBar />

          {/* Category chip strip */}
          <div className="mt-3 -mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-2 pb-1">
              <span className="mr-1 hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:inline">Explorar</span>
              <ChipLink active={!category} to="/buscar" params={{ ...search, category: undefined }}>Todas</ChipLink>
              {(cats.data ?? []).map((c) => (
                <ChipLink
                  key={c.id}
                  active={category === c.slug}
                  to="/buscar"
                  params={{ ...search, category: c.slug }}
                  icon={<CategoryIcon name={c.icon} className="h-3.5 w-3.5" />}
                >
                  {c.name}
                </ChipLink>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-8 px-4 py-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <FiltersPanel
            sort={sort} setSort={(v) => setParam("sort", v)}
            minRating={minRating} setMinRating={(v) => setParam("minRating", v === 0 ? undefined : v)}
            premium={premium} setPremium={(v) => setParam("premium", v ? true : undefined)}
            plan={plan} setPlan={(v) => setParam("plan", v === "all" ? undefined : v)}
            city={city} setCity={(v) => setParam("city", v || undefined)}
            cities={cities.data ?? []}
          />
        </aside>

        <div className="min-w-0">
          {/* Results toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {results.isLoading ? "Buscando…" : (
                <>
                  <span className="font-medium text-foreground">{total ?? items.length}</span>{" "}
                  {(total ?? items.length) === 1 ? "empresa encontrada" : "empresas encontradas"}
                  {q && <> para <span className="font-medium text-foreground">“{q}”</span></>}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile filter drawer */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filtros{activeChips.length ? ` · ${activeChips.length}` : ""}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[88vw] max-w-md overflow-y-auto p-4">
                  <SheetHeader><SheetTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</SheetTitle></SheetHeader>
                  <div className="mt-4">
                    <FiltersPanel
                      sort={sort} setSort={(v) => setParam("sort", v)}
                      minRating={minRating} setMinRating={(v) => setParam("minRating", v === 0 ? undefined : v)}
                      premium={premium} setPremium={(v) => setParam("premium", v ? true : undefined)}
                      plan={plan} setPlan={(v) => setParam("plan", v === "all" ? undefined : v)}
                      city={city} setCity={(v) => setParam("city", v || undefined)}
                      cities={cities.data ?? []}
                    />
                  </div>
                  <SheetFooter className="mt-6"><Button variant="ghost" onClick={clearAll} className="w-full">Limpar filtros</Button></SheetFooter>
                </SheetContent>
              </Sheet>

              {/* Sort (compact) */}
              <div className="hidden items-center gap-1 sm:flex">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sort} onValueChange={(v) => setParam("sort", v as typeof sort)}>
                  <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevância</SelectItem>
                    <SelectItem value="rating">Melhor avaliados</SelectItem>
                    <SelectItem value="name">Nome (A–Z)</SelectItem>
                    <SelectItem value="newest">Mais recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeChips.map((c, i) => (
                <button key={i} onClick={c.onClear} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs hover:bg-muted">
                  {c.label} <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={clearAll} className="text-xs font-medium text-primary hover:underline">Limpar tudo</button>
            </div>
          )}

          {/* Results */}
          {results.isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Search className="h-6 w-6 text-muted-foreground" /></div>
              <p className="mt-3 text-lg font-semibold">Nenhuma empresa encontrada</p>
              <p className="mt-1 text-sm text-muted-foreground">Tente remover alguns filtros ou usar termos diferentes.</p>
              {activeChips.length > 0 && <Button variant="outline" size="sm" onClick={clearAll} className="mt-4">Limpar filtros</Button>}
            </div>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((co) => (
                  <CompanyCard key={co.id} company={toCompanyCardData(co)} />
                ))}
              </div>
              <div ref={sentinelRef} className="mt-6 flex justify-center">
                {results.isFetchingNextPage ? (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando mais…
                  </span>
                ) : results.hasNextPage ? (
                  <Button variant="outline" size="sm" onClick={() => results.fetchNextPage()}>Carregar mais</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Fim dos resultados</span>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}

function ChipLink({
  to, params, active, icon, children,
}: { to: "/buscar"; params: Record<string, unknown>; active: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      search={params as never}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
        active
          ? "border-primary-dark bg-primary-dark text-primary-foreground shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-background hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function FiltersPanel(props: {
  sort: "relevance" | "rating" | "name" | "newest";
  setSort: (v: "relevance" | "rating" | "name" | "newest") => void;
  minRating: number;
  setMinRating: (v: number) => void;
  premium: boolean;
  setPremium: (v: boolean) => void;
  plan: "all" | "free" | "premium" | "featured";
  setPlan: (v: "all" | "free" | "premium" | "featured") => void;
  city: string | undefined;
  setCity: (v: string) => void;
  cities: { id: string; name: string; slug: string }[];
}) {
  return (
    <div className="space-y-6">
      <div className="sm:hidden">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ordenar por</h3>
        <Select value={props.sort} onValueChange={(v) => props.setSort(v as typeof props.sort)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevância</SelectItem>
            <SelectItem value="rating">Melhor avaliados</SelectItem>
            <SelectItem value="name">Nome (A–Z)</SelectItem>
            <SelectItem value="newest">Mais recentes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</h3>
        <Select value={props.city ?? "todas"} onValueChange={(v) => props.setCity(v === "todas" ? "" : v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as cidades</SelectItem>
            {props.cities.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plano</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { v: "all", label: "Todos" },
            { v: "featured", label: "Destaque", icon: <Crown className="h-3.5 w-3.5" /> },
            { v: "premium", label: "Premium" },
            { v: "free", label: "Grátis" },
          ] as const).map((p) => (
            <button
              key={p.v}
              onClick={() => props.setPlan(p.v)}
              className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                props.plan === p.v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {("icon" in p ? p.icon : null)}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avaliação mínima</h3>
        <div className="grid grid-cols-4 gap-1.5">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => props.setMinRating(r)}
              className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                props.minRating === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {r === 0 ? "Qualquer" : <><Star className="h-3 w-3 fill-current" />{r}+</>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-3">
        <Checkbox id="premium" checked={props.premium} onCheckedChange={(v) => props.setPremium(!!v)} />
        <Label htmlFor="premium" className="cursor-pointer text-sm">Somente empresas Premium</Label>
      </div>
    </div>
  );
}

function SmartSearchBar() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  const [city, setCity] = useState(search.city ?? "todas");
  const [open, setOpen] = useState(false);
  const cities = useQuery(citiesQueryOptions);
  const cats = useQuery(categoriesQueryOptions);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQ(search.q ?? ""); }, [search.q]);
  useEffect(() => { setCity(search.city ?? "todas"); }, [search.city]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 180); return () => clearTimeout(t); }, [q]);

  const suggestions = useQuery({
    queryKey: ["suggest", debouncedQ, city === "todas" ? "" : city],
    queryFn: () => suggestCompanies(debouncedQ, city === "todas" ? undefined : city),
    enabled: open && debouncedQ.trim().length >= 2,
    staleTime: 30_000,
  });

  const catMatches = useMemo(() => {
    const qq = debouncedQ.trim().toLowerCase();
    if (qq.length < 2) return [];
    return (cats.data ?? []).filter((c) => c.name.toLowerCase().includes(qq)).slice(0, 4);
  }, [cats.data, debouncedQ]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setOpen(false);
    navigate({
      to: "/buscar",
      search: { ...search, q: q.trim() || undefined, city: city && city !== "todas" ? city : undefined },
    });
  }

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={submit}
        className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card p-2 shadow-[0_20px_50px_-24px_rgb(15_23_42/0.35)] ring-1 ring-black/5 md:flex-row md:items-center md:gap-0 md:rounded-full md:p-1.5"
      >
        <div className="flex flex-1 items-center gap-2 px-4 py-2">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="O que você procura? Ex: eletricista, gráfica…"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} className="text-muted-foreground hover:text-foreground" aria-label="Limpar">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="hidden h-8 w-px bg-border md:block" />
        <div className="flex items-center gap-2 px-4 py-2 md:min-w-[220px]">
          <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full cursor-pointer bg-transparent text-sm text-foreground outline-none"
          >
            <option value="todas">Todas as cidades</option>
            {(cities.data ?? []).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <Button type="submit" size="lg" className="rounded-xl px-6 shadow-md md:rounded-full">Buscar</Button>
      </form>

      {/* Suggestions dropdown */}
      {open && debouncedQ.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-popover p-2 shadow-xl">
          {catMatches.length > 0 && (
            <div className="mb-1">
              <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Categorias</div>
              {catMatches.map((c) => (
                <Link
                  key={c.id}
                  to="/buscar"
                  search={{ ...search, category: c.slug, q: undefined }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  <CategoryIcon name={c.icon} className="h-4 w-4 text-primary" />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          )}
          <div>
            <div className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Empresas</div>
            {suggestions.isFetching && !suggestions.data ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></div>
            ) : (suggestions.data ?? []).length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">Nenhuma empresa encontrada. Pressione Enter para buscar em todos os campos.</div>
            ) : (
              (suggestions.data ?? []).map((s) => (
                <Link
                  key={s.id}
                  to="/empresa/$slug"
                  params={{ slug: s.slug }}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
                >
                  {s.logo_url ? (
                    <img src={s.logo_url} alt="" className="h-8 w-8 rounded-md border border-border object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">{s.name.charAt(0)}</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.name}</div>
                    {s.city_name && <div className="truncate text-xs text-muted-foreground">{s.city_name}</div>}
                  </div>
                </Link>
              ))
            )}
          </div>
          <button
            type="button"
            onClick={() => submit()}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <Search className="h-4 w-4" /> Ver todos os resultados para “{debouncedQ.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}

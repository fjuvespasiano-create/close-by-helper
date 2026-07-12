import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Download, TrendingUp, MousePointerClick, Eye, Percent } from "lucide-react";

export const Route = createFileRoute("/admin/analytics-anuncios")({
  head: () => ({ meta: [{ title: "Analytics de Anúncios — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AnalyticsAnunciosPage,
});

type Campaign = {
  id: string;
  name: string;
  image_url: string;
  link_url: string;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  city_slug: string | null;
  placement: string | null;
};


type EventRow = {
  name: string;
  entity_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmtBr(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
}

function AnalyticsAnunciosPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [rangeDays, setRangeDays] = useState(30);
  const [selectedId, setSelectedId] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [placementFilter, setPlacementFilter] = useState<string>("");
  const [prevEvents, setPrevEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const start = daysAgo(rangeDays).toISOString();
      const prevStart = daysAgo(rangeDays * 2).toISOString();
      const prevEnd = daysAgo(rangeDays).toISOString();
      const [campsRes, evsRes, prevRes] = await Promise.all([
        supabase
          .from("ad_campaigns")
          .select("id,name,image_url,link_url,starts_at,ends_at,active,city_slug,placement")
          .order("created_at", { ascending: false }),
        supabase
          .from("analytics_events")
          .select("name,entity_id,meta,created_at")
          .eq("entity_type", "ad_campaign")
          .gte("created_at", start)
          .order("created_at", { ascending: false })
          .limit(20000),
        supabase
          .from("analytics_events")
          .select("name,entity_id,created_at")
          .eq("entity_type", "ad_campaign")
          .gte("created_at", prevStart)
          .lt("created_at", prevEnd)
          .limit(20000),
      ]);
      if (cancelled) return;
      const firstError = campsRes.error ?? evsRes.error ?? prevRes.error;
      if (firstError) {
        setLoadError(firstError.message);
        setCampaigns([]);
        setEvents([]);
        setPrevEvents([]);
      } else {
        setCampaigns((campsRes.data ?? []) as Campaign[]);
        setEvents((evsRes.data ?? []) as EventRow[]);
        setPrevEvents((prevRes.data ?? []) as EventRow[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [rangeDays]);

  const cities = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.city_slug).filter(Boolean))) as string[],
    [campaigns],
  );
  const placements = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.placement).filter(Boolean))) as string[],
    [campaigns],
  );

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter(
        (c) =>
          (!cityFilter || c.city_slug === cityFilter) &&
          (!placementFilter || c.placement === placementFilter),
      ),
    [campaigns, cityFilter, placementFilter],
  );
  const allowedIds = useMemo(() => new Set(filteredCampaigns.map((c) => c.id)), [filteredCampaigns]);
  const scopedEvents = useMemo(
    () => events.filter((e) => !e.entity_id || allowedIds.has(e.entity_id)),
    [events, allowedIds],
  );
  const scopedPrev = useMemo(
    () => prevEvents.filter((e) => !e.entity_id || allowedIds.has(e.entity_id)),
    [prevEvents, allowedIds],
  );


  // Overview metrics
  const overview = useMemo(() => {
    const impressions = scopedEvents.filter((e) => e.name === "ad_impression").length;
    const clicks = scopedEvents.filter((e) => e.name === "ad_click").length;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    const prevImp = scopedPrev.filter((e) => e.name === "ad_impression").length;
    const prevClk = scopedPrev.filter((e) => e.name === "ad_click").length;
    const impDelta = prevImp ? ((impressions - prevImp) / prevImp) * 100 : impressions > 0 ? 100 : 0;
    const clkDelta = prevClk ? ((clicks - prevClk) / prevClk) * 100 : clicks > 0 ? 100 : 0;

    const byCampaign = new Map<string, { impressions: number; clicks: number }>();
    for (const e of scopedEvents) {
      if (!e.entity_id) continue;
      const s = byCampaign.get(e.entity_id) ?? { impressions: 0, clicks: 0 };
      if (e.name === "ad_impression") s.impressions++;
      else if (e.name === "ad_click") s.clicks++;
      byCampaign.set(e.entity_id, s);
    }
    const top = Array.from(byCampaign.entries())
      .map(([id, v]) => {
        const c = campaigns.find((x) => x.id === id);
        return {
          id,
          name: c?.name ?? "—",
          city: c?.city_slug ?? "—",
          placement: c?.placement ?? "—",
          ...v,
          ctr: v.impressions ? (v.clicks / v.impressions) * 100 : 0,
        };
      })
      .sort((a, b) => b.clicks - a.clicks);

    return { impressions, clicks, ctr, top, impDelta, clkDelta };
  }, [scopedEvents, scopedPrev, campaigns]);


  // Selected campaign metrics
  const report = useMemo(() => {
    if (!selectedId) return null;
    const campaign = campaigns.find((c) => c.id === selectedId);
    if (!campaign) return null;
    const filtered = scopedEvents.filter((e) => e.entity_id === selectedId);
    const impressions = filtered.filter((e) => e.name === "ad_impression").length;
    const clicks = filtered.filter((e) => e.name === "ad_click").length;
    const ctr = impressions ? (clicks / impressions) * 100 : 0;

    // Per-day series
    const days: string[] = [];
    for (let i = rangeDays - 1; i >= 0; i--) days.push(fmtDay(daysAgo(i)));
    const seriesMap = new Map(days.map((d) => [d, { day: d, impressions: 0, clicks: 0 }]));
    for (const e of filtered) {
      const d = e.created_at.slice(0, 10);
      const s = seriesMap.get(d);
      if (!s) continue;
      if (e.name === "ad_impression") s.impressions++;
      else if (e.name === "ad_click") s.clicks++;
    }
    const series = Array.from(seriesMap.values()).map((s) => ({ ...s, label: fmtBr(s.day) }));

    // Device split (clicks)
    let mobile = 0;
    let desktop = 0;
    for (const e of filtered) {
      const dev = (e.meta as { device?: string } | null)?.device;
      if (dev === "mobile") mobile++;
      else if (dev === "desktop") desktop++;
    }
    const totalDev = mobile + desktop;
    const mobilePct = totalDev ? (mobile / totalDev) * 100 : 0;
    const desktopPct = totalDev ? (desktop / totalDev) * 100 : 0;

    return { campaign, impressions, clicks, ctr, series, mobilePct, desktopPct };
  }, [selectedId, events, campaigns, rangeDays]);

  async function exportPdf() {
    if (!reportRef.current || !report) return;
    const html2pdf = (await import("html2pdf.js")).default;
    await html2pdf()
      .set({
        margin: 10,
        filename: `relatorio-${report.campaign.name.replace(/\s+/g, "-").toLowerCase()}.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(reportRef.current)
      .save();
  }

  function exportCsv() {
    const header = ["#", "Anunciante", "Cidade", "Posicionamento", "Views", "Cliques", "CTR (%)"];
    const rows = overview.top.map((r, i) => [
      i + 1,
      `"${r.name.replace(/"/g, '""')}"`,
      r.city,
      r.placement,
      r.impressions,
      r.clicks,
      r.ctr.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-anuncios-${rangeDays}d-${fmtDay(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Analytics de Anúncios</h1>
          <p className="text-sm text-muted-foreground">
            Métricas para provar valor ao comerciante local e renovar contratos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todas as cidades</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={placementFilter}
            onChange={(e) => setPlacementFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Todos os canais</option>
            {placements.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={15}>Últimos 15 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={<Eye className="h-4 w-4" />} label="Visualizações totais" value={overview.impressions.toLocaleString("pt-BR")} delta={overview.impDelta} />
        <MetricCard icon={<MousePointerClick className="h-4 w-4" />} label="Cliques totais" value={overview.clicks.toLocaleString("pt-BR")} delta={overview.clkDelta} />
        <MetricCard icon={<Percent className="h-4 w-4" />} label="CTR médio" value={`${overview.ctr.toFixed(2)}%`} />
        <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Anúncios ativos" value={String(filteredCampaigns.filter((c) => c.active).length)} />
      </div>


      {/* Top anunciantes */}
      <section className="rounded-xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Top anunciantes do período</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
        ) : overview.top.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Nenhum evento registrado ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Anunciante</th>
                  <th className="px-4 py-2 text-right">Views</th>
                  <th className="px-4 py-2 text-right">Cliques</th>
                  <th className="px-4 py-2 text-right">CTR</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {overview.top.map((r, i) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-right">{r.impressions.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2 text-right">{r.clicks.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2 text-right">{r.ctr.toFixed(2)}%</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedId(r.id)}
                        className="rounded-md border border-input px-3 py-1 text-xs hover:bg-muted"
                      >
                        Ver relatório
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Report per campaign */}
      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="font-semibold">Relatório por anunciante</h2>
            <p className="text-xs text-muted-foreground">Selecione uma campanha para gerar o PDF que vai para o cliente.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">— escolher anunciante —</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={exportPdf}
              disabled={!report}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Exportar PDF
            </button>
          </div>
        </div>

        {report ? (
          <div ref={reportRef} className="space-y-6 bg-white p-6 text-slate-900">
            <header className="border-b pb-4">
              <div className="text-xs uppercase tracking-widest text-slate-500">Relatório de performance de anúncio</div>
              <h3 className="mt-1 text-2xl font-bold">{report.campaign.name}</h3>
              <div className="mt-1 text-sm text-slate-600">
                Período: últimos {rangeDays} dias · Emitido em {new Date().toLocaleDateString("pt-BR")}
              </div>
            </header>

            <div className="grid gap-3 sm:grid-cols-3">
              <ReportKPI label="Visualizações" value={report.impressions.toLocaleString("pt-BR")} sub="Moradores impactados" />
              <ReportKPI label="Cliques diretos" value={report.clicks.toLocaleString("pt-BR")} sub="Potenciais clientes" />
              <ReportKPI label="Taxa de clique (CTR)" value={`${report.ctr.toFixed(2)}%`} sub={report.ctr >= 2 ? "Engajamento saudável" : "Vamos otimizar"} />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                Tendência diária (views x cliques)
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer>
                  <LineChart data={report.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={11} stroke="#64748b" allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="impressions" name="Views" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="clicks" name="Cliques" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Origem do público</h4>
              <div className="h-52 w-full">
                <ResponsiveContainer>
                  <BarChart
                    data={[
                      { device: "Celular", pct: Number(report.mobilePct.toFixed(1)) },
                      { device: "Computador", pct: Number(report.desktopPct.toFixed(1)) },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="device" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="pct" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <footer className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              <strong>Próximo passo:</strong> com base nesses {report.clicks.toLocaleString("pt-BR")} cliques,
              cada potencial cliente interessado no seu serviço teve um custo direto muito abaixo do que
              qualquer mídia paga tradicional. Vamos renovar o destaque para o próximo mês?
            </footer>
          </div>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            Selecione um anunciante acima para visualizar o relatório completo.
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, delta }: { icon: React.ReactNode; label: string; value: string; delta?: number }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {typeof delta === "number" && (
        <div className={`mt-1 text-xs font-medium ${up ? "text-emerald-600" : "text-red-600"}`}>
          {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs período anterior
        </div>
      )}
    </div>
  );
}


function ReportKPI({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  );
}

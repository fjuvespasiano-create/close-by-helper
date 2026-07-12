import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LiveFeedItem,
  LiveFeedSource,
  SOURCE_META,
} from "./types";

const SINCE_HOURS = 72;

interface FetchOpts {
  cityId?: string | null;
  limit?: number;
}

interface RawResults {
  items: LiveFeedItem[];
  hiddenKeys: Set<string>;
  blacklist: string[];
}

async function fetchLiveFeed({ cityId, limit = 60 }: FetchOpts): Promise<RawResults> {
  const sinceISO = new Date(Date.now() - SINCE_HOURS * 3600 * 1000).toISOString();

  const eventsQ = supabase
    .from("events")
    .select("id,title,description,city_id,created_at,slug")
    .gte("created_at", sinceISO)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);




  const promoQ = supabase
    .from("promotions")
    .select("id,title,description,city_id,created_at")
    .gte("created_at", sinceISO)
    .eq("status", "active" as never)
    .order("created_at", { ascending: false })
    .limit(limit);

  const procQ = supabase
    .from("procurements")
    .select("id,title,object,city_id,created_at,source_url")
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: false })
    .limit(limit);


  const actQ = supabase
    .from("representative_activities")
    .select("id,title,description,city_id,created_at,representative_id")
    .gte("created_at", sinceISO)
    .order("created_at", { ascending: false })
    .limit(limit);

  const hiddenQ = supabase.from("live_feed_hidden").select("source,source_id");
  const settingsQ = supabase
    .from("system_settings")
    .select("value")
    .eq("key", "live_feed_blacklist")
    .maybeSingle();

  const [events, promotions, procurements, activities, hidden, settings] =
    await Promise.all([eventsQ, promoQ, procQ, actQ, hiddenQ, settingsQ]);

  const hiddenKeys = new Set<string>(
    (hidden.data ?? []).map((h) => `${h.source}:${h.source_id}`),
  );
  const rawBlacklist = settings.data?.value;
  const blacklist = Array.isArray(rawBlacklist)
    ? (rawBlacklist as unknown[]).map((v) => String(v).toLowerCase()).filter(Boolean)
    : [];

  const items: LiveFeedItem[] = [];

  const push = (
    source: LiveFeedSource,
    row: {
      id: string;
      title: string | null;
      description?: string | null;
      city_id?: string | null;
      created_at: string;
      href?: string;
    },
  ) => {
    if (!row.title) return;
    const meta = SOURCE_META[source];
    items.push({
      key: `${source}:${row.id}`,
      source,
      sourceId: row.id,
      category: meta.category,
      title: row.title,
      description: row.description ?? null,
      cityId: row.city_id ?? null,
      createdAt: row.created_at,
      href: row.href,
      icon: meta.icon,
      badgeLabel: meta.label,
    });
  };

  (events.data ?? []).forEach((e) =>
    push("event", { ...e, href: e.slug ? `/eventos/${e.slug}` : "/eventos" }),
  );
  (promotions.data ?? []).forEach((p) =>
    push("promotion", { ...p, href: "/promocoes" }),
  );

  (procurements.data ?? []).forEach((p) =>
    push("procurement", {
      id: p.id,
      title: p.title,
      description: p.object,
      city_id: p.city_id,
      created_at: p.created_at,
      href: p.source_url ?? undefined,
    }),
  );

  (activities.data ?? []).forEach((a) =>
    push("activity", {
      ...a,
      href: a.representative_id
        ? `/representantes/${a.representative_id}`
        : "/representantes",
    }),
  );

  return { items, hiddenKeys, blacklist };
}

export function useLiveFeed(opts: FetchOpts = {}) {
  const queryClient = useQueryClient();
  const cityId = opts.cityId ?? null;
  const limit = opts.limit ?? 60;

  const queryKey = useMemo(() => ["live-feed", cityId, limit], [cityId, limit]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchLiveFeed({ cityId, limit }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const tables = [
      "events",
      "jobs",
      "promotions",
      "procurements",
      "representative_activities",
      "live_feed_hidden",
      "system_settings",
    ] as const;
    const channel = supabase.channel("live-feed");
    tables.forEach((t) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: t },
        () => queryClient.invalidateQueries({ queryKey: ["live-feed"] }),
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const items = useMemo(() => {
    if (!query.data) return [] as LiveFeedItem[];
    const { items: raw, hiddenKeys, blacklist } = query.data;
    return raw
      .filter((i) => !hiddenKeys.has(i.key))
      .filter((i) => {
        if (!cityId) return true;
        if (i.cityId === null) return true; // jobs & similar sem city_id — mostra sempre
        return i.cityId === cityId;
      })
      .filter((i) => {
        if (blacklist.length === 0) return true;
        const hay = `${i.title} ${i.description ?? ""}`.toLowerCase();
        return !blacklist.some((w) => hay.includes(w));
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [query.data, cityId]);

  return { ...query, items };
}

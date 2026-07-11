// Captura global de console, erros e requisições - roda no browser apenas.
// Buffers circulares por tab, prontos para anexar em um ticket QA.

export type QaLogEntry = {
  level: "log" | "info" | "warn" | "error";
  ts: number;
  message: string;
  stack?: string;
};

export type QaNetEntry = {
  ts: number;
  method: string;
  url: string;
  status?: number;
  duration_ms?: number;
  error?: string;
};

const MAX_LOGS = 60;
const MAX_NET = 40;

const logs: QaLogEntry[] = [];
const net: QaNetEntry[] = [];
let installed = false;

function push<T>(arr: T[], item: T, max: number) {
  arr.push(item);
  if (arr.length > max) arr.splice(0, arr.length - max);
}

function safeStringify(a: unknown): string {
  try {
    if (a instanceof Error) return a.message;
    if (typeof a === "string") return a;
    return JSON.stringify(a);
  } catch {
    return String(a);
  }
}

export function installQaCapture() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const wrap = (level: QaLogEntry["level"]) => {
    const orig = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      try {
        push(
          logs,
          {
            level,
            ts: Date.now(),
            message: args.map(safeStringify).join(" ").slice(0, 2000),
            stack: args.find((a) => a instanceof Error)
              ? ((args.find((a) => a instanceof Error) as Error).stack ?? "").slice(0, 2000)
              : undefined,
          },
          MAX_LOGS,
        );
      } catch {
        /* ignore */
      }
      orig(...args);
    };
  };
  wrap("warn");
  wrap("error");

  window.addEventListener("error", (e) => {
    push(
      logs,
      {
        level: "error",
        ts: Date.now(),
        message: `[window.onerror] ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`,
        stack: e.error?.stack?.slice(0, 2000),
      },
      MAX_LOGS,
    );
  });

  window.addEventListener("unhandledrejection", (e) => {
    push(
      logs,
      {
        level: "error",
        ts: Date.now(),
        message: `[unhandledrejection] ${safeStringify(e.reason)}`,
        stack: (e.reason as Error)?.stack?.slice(0, 2000),
      },
      MAX_LOGS,
    );
  });

  // fetch interceptor
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const method = (init?.method ?? "GET").toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    try {
      const res = await origFetch(input, init);
      push(
        net,
        {
          ts: Date.now(),
          method,
          url: url.slice(0, 500),
          status: res.status,
          duration_ms: Math.round(performance.now() - start),
        },
        MAX_NET,
      );
      return res;
    } catch (err) {
      push(
        net,
        {
          ts: Date.now(),
          method,
          url: url.slice(0, 500),
          error: (err as Error)?.message ?? "network error",
          duration_ms: Math.round(performance.now() - start),
        },
        MAX_NET,
      );
      throw err;
    }
  };
}

export function getQaBuffers() {
  return { logs: [...logs], net: [...net] };
}

export function clearQaBuffers() {
  logs.length = 0;
  net.length = 0;
}

// ---------- Device / browser fingerprint ----------
export function collectDeviceInfo() {
  if (typeof window === "undefined") return {};
  const ua = navigator.userAgent;
  const platform = detectPlatform(ua);
  const browser = detectBrowser(ua);
  return {
    user_agent: ua,
    platform,
    browser: browser.name,
    browser_version: browser.version,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    dpr: window.devicePixelRatio,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    is_pwa:
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true,
    online: navigator.onLine,
    referrer: document.referrer || null,
  };
}

function detectPlatform(ua: string) {
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Unknown";
}

function detectBrowser(ua: string) {
  const rules: { name: string; re: RegExp }[] = [
    { name: "Edge", re: /Edg\/([\d.]+)/ },
    { name: "Opera", re: /OPR\/([\d.]+)/ },
    { name: "Chrome", re: /Chrome\/([\d.]+)/ },
    { name: "Safari", re: /Version\/([\d.]+).*Safari/ },
    { name: "Firefox", re: /Firefox\/([\d.]+)/ },
  ];
  for (const r of rules) {
    const m = ua.match(r.re);
    if (m) return { name: r.name, version: m[1] };
  }
  return { name: "Unknown", version: "" };
}

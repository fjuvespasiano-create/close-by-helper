/**
 * PWA client helpers: service worker registration, install prompt, notifications.
 */

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function subscribeInstallPrompt(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function canInstall() {
  return deferredPrompt !== null;
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  emit();
  return outcome;
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Auto-update on new SW
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage("SKIP_WAITING");
            }
          });
        });
      })
      .catch((err) => console.warn("[PWA] SW registration failed", err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Play alert sound when the SW asks (high-priority push while a tab is open)
    navigator.serviceWorker.addEventListener("message", (event) => {
      const d = event.data as { type?: string; url?: string } | undefined;
      if (!d || d.type !== "PLAY_ALERT_SOUND") return;
      try {
        const a = new Audio(d.url || "/alert.mp3");
        a.volume = 1;
        void a.play().catch(() => {});
      } catch {}
    });
  });
}

// ---------------- High-Alert test ----------------

export async function fireHighAlertTest(): Promise<"ok" | "denied" | "unsupported"> {
  const perm = await requestNotificationPermission();
  if (perm === "unsupported") return "unsupported";
  if (perm !== "granted") return "denied";
  // Play the sound directly — user gesture allows autoplay here.
  try {
    const a = new Audio("/alert.mp3");
    a.volume = 1;
    void a.play().catch(() => {});
  } catch {}
  if ("vibrate" in navigator) {
    try { navigator.vibrate([300, 100, 300, 100, 500]); } catch {}
  }
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Novo Alerta Crítico!", {
      body: "Este é um teste de alerta de alta prioridade com som e vibração.",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: `agendaaqui-high-test-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 500],
      data: { url: "/", priority: "high", sound: "/alert.mp3" },
    } as NotificationOptions);
    return "ok";
  }
  new Notification("Novo Alerta Crítico!", { body: "Teste de alerta crítico.", icon: "/icons/icon-192.png" });
  return "ok";
}

// ---------------- Notifications ----------------

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted" || Notification.permission === "denied") return Notification.permission;
  return await Notification.requestPermission();
}

export async function showLocalNotification(title: string, body: string, url = "/") {
  const perm = await requestNotificationPermission();
  if (perm !== "granted") return false;
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
      tag: "agendaaqui-local",
    });
    return true;
  }
  new Notification(title, { body, icon: "/icons/icon-192.png" });
  return true;
}

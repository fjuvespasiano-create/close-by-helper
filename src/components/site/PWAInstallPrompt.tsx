import { useEffect, useState } from "react";
import { Download, X, Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canInstall,
  isStandalone,
  notificationPermission,
  promptInstall,
  requestNotificationPermission,
  showLocalNotification,
  subscribeInstallPrompt,
} from "@/lib/pwa";
import { toast } from "sonner";

const DISMISS_KEY = "pwa_install_dismissed_at";
const NOTIF_DISMISS_KEY = "pwa_notif_dismissed_at";
const DAY_MS = 24 * 60 * 60 * 1000;

function recentlyDismissed(key: string, days = 7) {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const t = Number(raw);
  return Number.isFinite(t) && Date.now() - t < days * DAY_MS;
}

export function PWAInstallPrompt() {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>("default");
  const [showInstall, setShowInstall] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setNotifPerm(notificationPermission());
    setInstallable(canInstall());
    const unsub = subscribeInstallPrompt(() => setInstallable(canInstall()));
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (installable && !installed && !recentlyDismissed(DISMISS_KEY)) setShowInstall(true);
      if (
        !installed &&
        notifPerm === "default" &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        !recentlyDismissed(NOTIF_DISMISS_KEY, 3)
      ) {
        setShowNotif(true);
      }
    }, 4000);
    return () => clearTimeout(t);
  }, [installable, installed, notifPerm]);

  // Hide the notification card as soon as the permission is decided
  // (granted/denied), so it never lingers after the browser prompt closes.
  useEffect(() => {
    if (notifPerm !== "default") setShowNotif(false);
  }, [notifPerm]);

  async function handleInstall() {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("App instalado! Abra pela tela inicial.");
    } else if (outcome === "unavailable") {
      toast.info("Abra o menu do navegador → 'Adicionar à tela inicial'.");
    }
    setShowInstall(false);
  }

  async function handleEnableNotif() {
    // Hide immediately so the card never lingers while the browser prompt is open.
    setShowNotif(false);
    localStorage.setItem(NOTIF_DISMISS_KEY, String(Date.now()));
    const perm = await requestNotificationPermission();
    // Read the browser's authoritative value in case the helper returned "unsupported".
    const effective = typeof Notification !== "undefined" ? Notification.permission : perm;
    setNotifPerm(effective);
    if (effective === "granted") {
      await showLocalNotification("Notificações ativadas 🎉", "Você receberá alertas sobre novos serviços e ofertas.", "/");
      toast.success("Notificações ativadas!");
    } else if (effective === "denied") {
      toast.error("Permissão negada. Ative nas configurações do navegador.");
    } else if (perm === "unsupported") {
      toast.error("Seu navegador não suporta notificações.");
    }
  }

  function dismissInstall() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShowInstall(false);
  }
  function dismissNotif() {
    localStorage.setItem(NOTIF_DISMISS_KEY, String(Date.now()));
    setShowNotif(false);
  }

  if (installed) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {showInstall && (
        <div className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Instalar AgendaAqui</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Acesso rápido, funciona offline e recebe notificações.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleInstall} className="h-8">Instalar</Button>
                <Button size="sm" variant="ghost" onClick={dismissInstall} className="h-8">Agora não</Button>
              </div>
            </div>
            <button aria-label="Fechar" onClick={dismissInstall} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showNotif && !showInstall && (
        <div className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-2xl border border-border/70 bg-background/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Ativar notificações</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Receba avisos de emergência, novos serviços e ofertas locais.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleEnableNotif} className="h-8">
                  <Bell className="mr-1 h-3.5 w-3.5" /> Ativar
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissNotif} className="h-8">Agora não</Button>
              </div>
            </div>
            <button aria-label="Fechar" onClick={dismissNotif} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

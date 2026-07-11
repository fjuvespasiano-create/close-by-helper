import { useEffect, useState } from "react";
import { Bell, BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { pushSupported, pushPermission, currentPushSubscription, enablePush, disablePush } from "@/lib/push-client";

export function EnableNotifications({ compact = false }: { compact?: boolean }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const s = pushSupported();
      setSupported(s);
      if (!s) return;
      setPermission(pushPermission());
      const sub = await currentPushSubscription();
      setSubscribed(!!sub);
    })();
  }, []);

  if (supported === null) return null;

  if (!supported) {
    return compact ? null : (
      <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
        Este navegador não suporta notificações push. Instale o app AgendaAqui para receber avisos.
      </div>
    );
  }

  async function onEnable() {
    setBusy(true);
    const r = await enablePush();
    setBusy(false);
    if (r.ok) {
      setSubscribed(true);
      setPermission(pushPermission());
      toast.success("Notificações ativadas!");
    } else {
      toast.error(r.error);
    }
  }

  async function onDisable() {
    setBusy(true);
    await disablePush();
    setBusy(false);
    setSubscribed(false);
    toast.success("Notificações desativadas.");
  }

  if (permission === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <div className="font-semibold text-destructive">Notificações bloqueadas</div>
          <p className="text-muted-foreground">Habilite nas configurações do navegador para receber avisos do AgendaAqui.</p>
        </div>
      </div>
    );
  }

  if (subscribed) {
    return compact ? (
      <Button variant="outline" size="sm" onClick={onDisable} disabled={busy}>
        <BellRing className="mr-2 h-4 w-4 text-primary" /> Ativadas
      </Button>
    ) : (
      <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <BellRing className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <div className="font-semibold text-foreground">Notificações ativas</div>
            <p className="text-sm text-muted-foreground">Você receberá novidades, promoções e avisos importantes.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onDisable} disabled={busy}>Desativar</Button>
      </div>
    );
  }

  return compact ? (
    <Button size="sm" onClick={onEnable} disabled={busy}>
      <Bell className="mr-2 h-4 w-4" /> Ativar
    </Button>
  ) : (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <div className="font-semibold text-foreground">Fique por dentro em tempo real</div>
          <p className="text-sm text-muted-foreground">Ative notificações e receba promoções, novidades e avisos personalizados.</p>
        </div>
      </div>
      <Button size="sm" onClick={onEnable} disabled={busy}>Ativar notificações</Button>
    </div>
  );
}

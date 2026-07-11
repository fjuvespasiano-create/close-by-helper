import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeWhatsapp } from "@/lib/whatsapp-subscribe.functions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { MessageCircle, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { CitySlug } from "@/hooks/useSelectedCity";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCity?: CitySlug;
};

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function WhatsAppSubscribeDialog({ open, onOpenChange, defaultCity = "vespasiano" }: Props) {
  const subscribe = useServerFn(subscribeWhatsapp);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState<CitySlug>(defaultCity);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await subscribe({ data: { name: name.trim(), phone, citySlug: city, consent: true } });
      setDone(true);
      toast.success("Pronto! Você receberá o resumo toda sexta.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao cadastrar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setDone(false);
    setName("");
    setPhone("");
    setConsent(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Resumo semanal no WhatsApp
          </DialogTitle>
          <DialogDescription>
            Toda sexta você recebe um resumo do que seus representantes fizeram na semana. Grátis, sem spam.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <div className="font-semibold">Inscrição confirmada!</div>
            <div className="text-sm text-muted-foreground">
              Enviamos uma mensagem de boas-vindas para o seu WhatsApp. Para cancelar, é só responder <strong>SAIR</strong>.
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full">Fechar</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wpp-name">Seu nome</Label>
              <Input id="wpp-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wpp-phone">WhatsApp</Label>
              <Input
                id="wpp-phone"
                inputMode="tel"
                placeholder="(31) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sua cidade</Label>
              <RadioGroup value={city} onValueChange={(v) => setCity(v as CitySlug)} className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="vespasiano" id="c-v" />
                  <span className="text-sm">Vespasiano</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <RadioGroupItem value="sao-jose-da-lapa" id="c-s" />
                  <span className="text-sm">São José da Lapa</span>
                </label>
              </RadioGroup>
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>
                Autorizo o AgenddaAqui a enviar mensagens no meu WhatsApp com resumo semanal das ações públicas. Posso cancelar a qualquer momento respondendo SAIR. (LGPD)
              </span>
            </label>
            <Button type="submit" className="w-full" disabled={loading || !consent}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
              Quero receber o resumo
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

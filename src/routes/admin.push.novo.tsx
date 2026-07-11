import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send, Bell, Rocket, Star, Megaphone, Newspaper, Gift, CalendarDays, AlertTriangle, Users } from "lucide-react";
import { sendPushNow } from "@/lib/admin-push.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/push/novo")({
  head: () => ({ meta: [{ title: "Novo envio push — Admin" }, { name: "robots", content: "noindex" }] }),
  component: NovoPush,
});

type Audience = { kind: string; city_id?: string; state?: string; category_id?: string };

const TEMPLATES = [
  { slug: "promocao", name: "Promoção", emoji: "🎉", color: "#F97316", title: "Promoção especial pra você!", body: "Confira as melhores ofertas de hoje no AgendaAqui.", icon: Rocket },
  { slug: "novidade", name: "Novidade", emoji: "🚀", color: "#3B82F6", title: "Novidade no AgendaAqui", body: "Acabou de chegar uma novidade que você vai gostar.", icon: Rocket },
  { slug: "destaque", name: "Destaque", emoji: "⭐", color: "#FACC15", title: "Empresa em destaque", body: "Conheça a empresa que está bombando na sua cidade.", icon: Star },
  { slug: "comunicado", name: "Comunicado", emoji: "📢", color: "#0EA5E9", title: "Aviso importante", body: "Uma novidade oficial do AgendaAqui pra você.", icon: Megaphone },
  { slug: "noticia", name: "Notícia", emoji: "📰", color: "#8B5CF6", title: "Notícia quentinha", body: "Fique por dentro do que acontece na sua região.", icon: Newspaper },
  { slug: "oferta", name: "Oferta", emoji: "🎁", color: "#EC4899", title: "Oferta imperdível", body: "Aproveite antes que acabe.", icon: Gift },
  { slug: "evento", name: "Evento", emoji: "📅", color: "#22C55E", title: "Evento chegando", body: "Não perca o próximo evento da sua cidade.", icon: CalendarDays },
  { slug: "manutencao", name: "Manutenção", emoji: "⚠️", color: "#EF4444", title: "Manutenção programada", body: "O AgendaAqui passará por manutenção rápida.", icon: AlertTriangle },
];

const AUDIENCES = [
  { k: "all", label: "Todos" },
  { k: "users", label: "Apenas usuários" },
  { k: "companies", label: "Donos de empresa" },
  { k: "premium", label: "Empresas Premium" },
  { k: "free", label: "Empresas Grátis" },
  { k: "admins", label: "Administradores" },
  { k: "pwa", label: "Instalaram o app" },
  { k: "recent30", label: "Novos (30 dias)" },
  { k: "inactive", label: "Inativos 60+ dias" },
  { k: "city", label: "Por cidade" },
  { k: "state", label: "Por estado" },
  { k: "category", label: "Por categoria" },
];

function NovoPush() {
  const nav = useNavigate();
  const send = useServerFn(sendPushNow);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [emoji, setEmoji] = useState("");
  const [color, setColor] = useState("#0057FF");
  const [category, setCategory] = useState("geral");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [audience, setAudience] = useState<Audience>({ kind: "all" });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities-list"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id, name, state").order("name");
      return (data ?? []) as Array<{ id: string; name: string; state: string }>;
    },
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["cats-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return (data ?? []) as Array<{ id: string; name: string }>;
    },
  });
  const states = Array.from(new Set(cities.map((c) => c.state))).sort();

  function applyTemplate(t: typeof TEMPLATES[number]) {
    setTitle(t.title); setBody(t.body); setEmoji(t.emoji); setColor(t.color); setCategory(t.slug);
  }

  const mut = useMutation({
    mutationFn: () => send({
      data: {
        title, body,
        icon_url: null,
        image_url: image || null,
        url: url || null,
        category,
        priority,
        color,
        emoji: emoji || null,
        buttons: null,
        audience: {
          kind: audience.kind as "all",
          city_id: audience.city_id || null,
          state: audience.state || null,
          category_id: audience.category_id || null,
        },
        template_id: null,
      },
    }),
    onSuccess: (res) => {
      toast.success(`Enviado para ${res.sent} dispositivo(s).`);
      nav({ to: "/admin/push/$id", params: { id: res.id } });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Editor */}
      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="mb-3 font-display font-semibold">Templates rápidos</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TEMPLATES.map((t) => (
              <button key={t.slug} type="button" onClick={() => applyTemplate(t)}
                className="rounded-lg border border-border p-3 text-left transition hover:border-primary hover:bg-primary/5">
                <div className="text-2xl">{t.emoji}</div>
                <div className="mt-1 text-sm font-medium">{t.name}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h3 className="font-display font-semibold">Conteúdo</h3>
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <div>
              <Label>Emoji</Label>
              <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🎉" maxLength={4} />
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da notificação" maxLength={120} />
            </div>
          </div>
          <div>
            <Label>Mensagem *</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva a mensagem…" rows={3} maxLength={400} />
            <div className="mt-1 text-xs text-muted-foreground">{body.length}/400</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>URL de destino</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label>Imagem (opcional)</Label>
              <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Categoria</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div>
              <Label>Prioridade</Label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as "low" | "normal" | "high")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
            <div>
              <Label>Cor de destaque</Label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background" />
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <h3 className="font-display font-semibold">Público</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <button key={a.k} type="button" onClick={() => setAudience({ kind: a.k })}
                className={`rounded-md border px-3 py-2 text-sm transition ${audience.kind === a.k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}>
                <Users className="mr-2 inline h-3.5 w-3.5" /> {a.label}
              </button>
            ))}
          </div>
          {audience.kind === "city" && (
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={audience.city_id ?? ""} onChange={(e) => setAudience({ kind: "city", city_id: e.target.value })}>
              <option value="">Selecione a cidade…</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.state}</option>)}
            </select>
          )}
          {audience.kind === "state" && (
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={audience.state ?? ""} onChange={(e) => setAudience({ kind: "state", state: e.target.value })}>
              <option value="">Selecione o estado…</option>
              {states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {audience.kind === "category" && (
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={audience.category_id ?? ""} onChange={(e) => setAudience({ kind: "category", category_id: e.target.value })}>
              <option value="">Selecione a categoria…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={() => mut.mutate()} disabled={mut.isPending || !title || !body}>
            <Send className="mr-2 h-4 w-4" /> {mut.isPending ? "Enviando…" : "Enviar agora"}
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="lg:sticky lg:top-6 self-start">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
            Prévia da notificação
          </div>
          <div className="p-4">
            <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                  style={{ background: `${color}22`, color }}>
                  {emoji || <Bell className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="truncate font-semibold text-foreground">{title || "Título da notificação"}</div>
                    <div className="text-xs text-muted-foreground">agora</div>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{body || "Sua mensagem aparecerá aqui."}</p>
                  {image ? <img src={image} alt="" className="mt-2 max-h-32 rounded object-cover" /> : null}
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Destinatários: <b>{AUDIENCES.find((a) => a.k === audience.kind)?.label}</b>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

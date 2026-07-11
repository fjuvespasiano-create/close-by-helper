import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, MapPin, MessageCircle, Phone, Share2, Flag, User as UserIcon, Package,
} from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/lib/favorites";
import {
  formatBRL, timeAgo, toListing, CONDITION_LABEL, type Listing,
} from "@/lib/marketplace";

function waUrl(phone: string, msg: string) {
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
}

export const Route = createFileRoute("/marketplace/$slug")({
  head: ({ loaderData }) => {
    const l = loaderData as { listing?: Listing } | undefined;
    if (!l?.listing) {
      return { meta: [{ title: "Anúncio — Marketplace" }, { name: "robots", content: "noindex" }] };
    }
    const price = formatBRL(l.listing.price);
    const desc = (l.listing.description ?? "").slice(0, 155) || `${l.listing.title} — ${price}`;
    const img = l.listing.images[0];
    return {
      meta: [
        { title: `${l.listing.title} — ${price} | Marketplace` },
        { name: "description", content: desc },
        { property: "og:title", content: l.listing.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        ...(img ? [{ property: "og:image", content: img }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  loader: async ({ params }): Promise<{ listing: Listing | null }> => {
    const { data } = await supabase
      .from("listings").select("*").eq("slug", params.slug).eq("status", "ativo").maybeSingle();
    return { listing: data ? toListing(data) : null };
  },
  errorComponent: () => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Erro ao carregar anúncio.</p>
        <Link to="/marketplace"><Button className="mt-4">Voltar</Button></Link>
      </div>
    </SiteLayout>
  ),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground">Anúncio não encontrado.</p>
        <Link to="/marketplace"><Button className="mt-4">Voltar</Button></Link>
      </div>
    </SiteLayout>
  ),
  component: ListingDetail,
});

function ListingDetail() {
  const { listing } = Route.useLoaderData() as { listing: Listing | null };
  const navigate = useNavigate();
  const userId = useCurrentUserId();
  const [activeImg, setActiveImg] = useState(0);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msg, setMsg] = useState("Olá! Tenho interesse no seu anúncio.");
  const [sending, setSending] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportNotes, setReportNotes] = useState("");

  const city = useQuery({
    queryKey: ["mk", "city", listing?.city_id],
    enabled: !!listing?.city_id,
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("name,slug").eq("id", listing!.city_id!).maybeSingle();
      return data as { name: string; slug: string } | null;
    },
  });

  const seller = useQuery({
    queryKey: ["mk", "seller", listing?.user_id],
    enabled: !!listing?.user_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name,avatar_url").eq("id", listing!.user_id).maybeSingle();
      return data as { name: string | null; avatar_url: string | null } | null;
    },
  });

  const otherListings = useQuery({
    queryKey: ["mk", "seller-listings", listing?.user_id, listing?.id],
    enabled: !!listing?.user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("listings").select("*").eq("user_id", listing!.user_id).eq("status", "ativo")
        .neq("id", listing!.id).limit(4);
      return (data ?? []).map(toListing);
    },
  });

  if (!listing) return null;

  async function sendMessage() {
    if (!userId) { navigate({ to: "/auth" }); return; }
    if (userId === listing!.user_id) { toast.error("Você não pode mandar mensagem no próprio anúncio."); return; }
    if (msg.trim().length < 2) { toast.error("Digite uma mensagem."); return; }
    setSending(true);
    const { error } = await supabase.from("listing_messages").insert({
      listing_id: listing!.id, buyer_id: userId, seller_id: listing!.user_id, sender_id: userId, body: msg.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mensagem enviada!");
    setMsgOpen(false);
    navigate({ to: "/painel/mensagens" });
  }

  async function submitReport() {
    if (!userId) { navigate({ to: "/auth" }); return; }
    if (reportReason.trim().length < 2) { toast.error("Informe o motivo."); return; }
    const { error } = await supabase.from("listing_reports").insert({
      listing_id: listing!.id, reporter_id: userId, reason: reportReason.trim(), notes: reportNotes.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Denúncia enviada. Vamos analisar.");
    setReportOpen(false);
    setReportReason(""); setReportNotes("");
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: listing!.title, url }); return; } catch { /* cancelado */ }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  }

  const cover = listing.images[activeImg] || listing.images[0];
  const location = [listing.neighborhood, city.data?.name].filter(Boolean).join(", ") || "—";

  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-4">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Marketplace
        </Link>
      </div>

      <div className="container mx-auto grid gap-6 px-4 pb-16 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="relative aspect-[4/3] w-full bg-muted">
              {cover ? (
                <img src={cover} alt={listing.title} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Package className="h-12 w-12" />
                </div>
              )}
            </div>
            {listing.images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-3">
                {listing.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${i === activeImg ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <Badge variant="secondary">{CONDITION_LABEL[listing.condition]}</Badge>
            <h1 className="mt-2 font-display text-2xl font-black sm:text-3xl">{listing.title}</h1>
            <p className="mt-1 text-3xl font-black text-primary">{formatBRL(listing.price)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {location}</span>
              <span>· {timeAgo(listing.created_at)}</span>
            </div>
            {listing.description ? (
              <div className="mt-6 whitespace-pre-wrap rounded-lg border bg-card p-4 text-sm leading-relaxed">
                {listing.description}
              </div>
            ) : null}
          </div>

          {otherListings.data && otherListings.data.length > 0 ? (
            <div className="mt-10">
              <h2 className="mb-3 font-display text-lg font-bold">Mais anúncios deste vendedor</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {otherListings.data.map((o) => (
                  <Link
                    key={o.id}
                    to="/marketplace/$slug"
                    params={{ slug: o.slug }}
                    className="flex gap-3 rounded-lg border bg-card p-3 hover:shadow"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                      {o.images[0] ? <img src={o.images[0]} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium">{o.title}</p>
                      <p className="text-sm font-bold text-primary">{formatBRL(o.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-muted">
                {seller.data?.avatar_url ? (
                  <img src={seller.data.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{seller.data?.name ?? "Vendedor"}</p>
                <p className="text-xs text-muted-foreground">Anunciante</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2" size="lg" disabled={userId === listing.user_id}>
                    <MessageCircle className="h-4 w-4" /> Enviar mensagem
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Mensagem para o vendedor</DialogTitle>
                  </DialogHeader>
                  {!userId ? (
                    <div className="py-4 text-sm text-muted-foreground">
                      Entre na sua conta para enviar mensagens.
                      <div className="mt-4"><Link to="/auth"><Button className="w-full">Entrar</Button></Link></div>
                    </div>
                  ) : (
                    <>
                      <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} maxLength={2000} />
                      <DialogFooter>
                        <Button onClick={sendMessage} disabled={sending}>
                          {sending ? "Enviando…" : "Enviar"}
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>

              {listing.contact_phone ? (
                userId ? (
                  showPhone ? (
                    <div className="space-y-2">
                      <a href={`tel:${listing.contact_phone.replace(/\D/g, "")}`}>
                        <Button variant="outline" className="w-full gap-2">
                          <Phone className="h-4 w-4" /> {listing.contact_phone}
                        </Button>
                      </a>
                      <a href={waUrl(listing.contact_phone, `Olá! Vi seu anúncio "${listing.title}" no AgendaAqui.`)}
                        target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" className="w-full gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                          WhatsApp
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={() => setShowPhone(true)}>
                      <Phone className="h-4 w-4" /> Ver telefone
                    </Button>
                  )
                ) : (
                  <Link to="/auth">
                    <Button variant="outline" className="w-full gap-2">
                      <Phone className="h-4 w-4" /> Entrar para ver telefone
                    </Button>
                  </Link>
                )
              ) : null}

              <Button variant="ghost" className="w-full gap-2" onClick={share}>
                <Share2 className="h-4 w-4" /> Compartilhar
              </Button>

              <Dialog open={reportOpen} onOpenChange={setReportOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="w-full gap-2 text-destructive hover:text-destructive">
                    <Flag className="h-4 w-4" /> Denunciar anúncio
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Denunciar anúncio</DialogTitle></DialogHeader>
                  {!userId ? (
                    <div className="py-4 text-sm text-muted-foreground">
                      Entre para denunciar.
                      <div className="mt-4"><Link to="/auth"><Button className="w-full">Entrar</Button></Link></div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium">Motivo</label>
                          <Input value={reportReason} onChange={(e) => setReportReason(e.target.value)}
                            placeholder="Ex: golpe, produto proibido, spam" maxLength={80} />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Detalhes (opcional)</label>
                          <Textarea value={reportNotes} onChange={(e) => setReportNotes(e.target.value)} rows={4} maxLength={1000} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={submitReport} variant="destructive">Enviar denúncia</Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Dicas de segurança</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Combine em local público.</li>
              <li>Confira o produto antes de pagar.</li>
              <li>Desconfie de preços muito abaixo do mercado.</li>
              <li>Não faça depósitos antecipados.</li>
            </ul>
          </div>
        </aside>
      </div>
    </SiteLayout>
  );
}


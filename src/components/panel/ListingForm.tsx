import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/lib/favorites";
import {
  fetchCategories, uploadListingImage, slugify, MAX_IMAGES,
  type Listing, type ListingCondition,
} from "@/lib/marketplace";

export type ListingFormValues = {
  title: string;
  description: string;
  price: string;
  condition: ListingCondition;
  category_slug: string;
  city_id: string;
  neighborhood: string;
  contact_phone: string;
  images: string[];
};

const schema = z.object({
  title: z.string().trim().min(5, "Título muito curto").max(120),
  description: z.string().trim().max(2000).optional(),
  price: z.string().refine((v) => v === "" || /^\d+([.,]\d{1,2})?$/.test(v), "Preço inválido"),
  condition: z.enum(["novo", "seminovo", "usado"]),
  category_slug: z.string().min(1, "Selecione uma categoria"),
  city_id: z.string().min(1, "Selecione a cidade"),
  neighborhood: z.string().trim().max(80).optional(),
  contact_phone: z.string().trim().max(20).optional(),
});

type CityRow = { id: string; name: string };

export function ListingForm({
  initial, existingId,
}: { initial?: Partial<ListingFormValues>; existingId?: string }) {
  const userId = useCurrentUserId();
  const navigate = useNavigate();
  const cats = useQuery({ queryKey: ["mk", "cats"], queryFn: fetchCategories });
  const cities = useQuery({
    queryKey: ["mk", "cities"],
    queryFn: async (): Promise<CityRow[]> => {
      const { data, error } = await supabase.from("cities").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as CityRow[];
    },
  });

  const [v, setV] = useState<ListingFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    price: initial?.price ?? "",
    condition: (initial?.condition as ListingCondition) ?? "usado",
    category_slug: initial?.category_slug ?? "",
    city_id: initial?.city_id ?? "",
    neighborhood: initial?.neighborhood ?? "",
    contact_phone: initial?.contact_phone ?? "",
    images: initial?.images ?? [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ListingFormValues>(k: K, val: ListingFormValues[K]) {
    setV((prev) => ({ ...prev, [k]: val }));
  }

  async function onFiles(files: FileList | null) {
    if (!files || !userId) return;
    const remaining = MAX_IMAGES - v.images.length;
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) { toast.info(`Máximo ${MAX_IMAGES} imagens.`); return; }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of list) {
        try { urls.push(await uploadListingImage(userId, f)); }
        catch (e) { toast.error((e as Error).message); }
      }
      if (urls.length) set("images", [...v.images, ...urls]);
    } finally { setUploading(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!userId) { navigate({ to: "/auth" }); return; }
    const parsed = schema.safeParse(v);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Erro de validação"); return; }
    if (v.images.length === 0) { toast.error("Adicione ao menos 1 foto."); return; }

    setSaving(true);
    const priceNum = v.price ? Number(v.price.replace(",", ".")) : null;
    const payload = {
      user_id: userId,
      title: v.title.trim(),
      description: v.description.trim() || null,
      price: priceNum,
      condition: v.condition,
      category_slug: v.category_slug,
      city_id: v.city_id,
      neighborhood: v.neighborhood.trim() || null,
      contact_phone: v.contact_phone.trim() || null,
      images: v.images,
    };

    if (existingId) {
      const { error } = await supabase.from("listings").update(payload).eq("id", existingId);
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Anúncio atualizado.");
      navigate({ to: "/painel/anuncios" });
    } else {
      const slug = `${slugify(v.title)}-${Math.random().toString(36).slice(2, 7)}`;
      const { error } = await supabase.from("listings").insert({ ...payload, slug });
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Anúncio publicado!");
      navigate({ to: "/painel/anuncios" });
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="text-sm font-medium">Fotos <span className="text-muted-foreground">({v.images.length}/{MAX_IMAGES})</span></label>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {v.images.map((img, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg border">
              <img src={img} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => set("images", v.images.filter((_, k) => k !== i))}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive shadow">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {v.images.length < MAX_IMAGES ? (
            <label className="flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground hover:bg-muted">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                onChange={(e) => onFiles(e.target.files)} disabled={uploading} />
            </label>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">JPG/PNG/WebP até 5 MB cada.</p>
      </div>

      <div>
        <label className="text-sm font-medium">Título *</label>
        <Input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: iPhone 12 128GB seminovo" maxLength={120} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Categoria *</label>
          <Select value={v.category_slug} onValueChange={(x) => set("category_slug", x)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {(cats.data ?? []).map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Condição *</label>
          <Select value={v.condition} onValueChange={(x) => set("condition", x as ListingCondition)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="seminovo">Seminovo</SelectItem>
              <SelectItem value="usado">Usado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Preço (R$)</label>
          <Input value={v.price} onChange={(e) => set("price", e.target.value)} placeholder="Deixe vazio para 'A combinar'" inputMode="decimal" />
        </div>
        <div>
          <label className="text-sm font-medium">Telefone (opcional)</label>
          <Input value={v.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} placeholder="(31) 9 9999-9999" maxLength={20} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Cidade *</label>
          <Select value={v.city_id} onValueChange={(x) => set("city_id", x)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {(cities.data ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Bairro</label>
          <Input value={v.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} placeholder="Ex: Centro" maxLength={80} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Descrição</label>
        <Textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={6}
          placeholder="Detalhes, estado de conservação, forma de pagamento…" maxLength={2000} />
        <p className="mt-1 text-xs text-muted-foreground">{v.description.length}/2000</p>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving || uploading} className="min-w-32">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : existingId ? "Salvar" : "Publicar"}
        </Button>
        <Link to="/painel/anuncios"><Button type="button" variant="ghost">Cancelar</Button></Link>
      </div>
    </form>
  );
}

// helper reused by edit route
export async function fetchOwnListing(id: string): Promise<Listing | null> {
  const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const rawImages = (data as { images?: unknown }).images;
  const images = Array.isArray(rawImages) ? (rawImages as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return { ...(data as unknown as Listing), images };
}

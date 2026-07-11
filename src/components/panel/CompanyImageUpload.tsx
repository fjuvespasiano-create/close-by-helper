import { useRef, useState } from "react";
import { Upload, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
// 10 years — signed URL kept in the company row; overwriting the object serves the new bytes.
const SIGNED_EXPIRY = 60 * 60 * 24 * 365 * 10;

export type ImageKind = "logo" | "banner";

const KIND_LABEL: Record<ImageKind, { title: string; hint: string; aspect: string }> = {
  logo: { title: "Logo", hint: "Quadrado, mínimo 256×256 · JPG/PNG/WebP · até 5 MB", aspect: "aspect-square max-w-[160px]" },
  banner: { title: "Banner de capa", hint: "Horizontal 1600×500 recomendado · JPG/PNG/WebP · até 5 MB", aspect: "aspect-[16/5]" },
};

type Props = {
  companyId: string;
  kind: ImageKind;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
};

export function CompanyImageUpload({ companyId, kind, value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const meta = KIND_LABEL[kind];

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato não permitido. Use JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem acima de 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `companies/${companyId}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type, upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("media")
        .createSignedUrl(path, SIGNED_EXPIRY);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Falha ao gerar URL");
      onChange(signed.signedUrl);
      toast.success(`${meta.title} atualizado.`);
    } catch (e) {
      toast.error((e as Error).message || "Falha ao enviar imagem.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{meta.title}</div>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            disabled={disabled || busy}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="mr-1 h-3.5 w-3.5" /> Remover
          </Button>
        ) : null}
      </div>

      <div
        className={`relative overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 ${meta.aspect}`}
      >
        {value ? (
          <img src={value} alt={meta.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          disabled={disabled || busy}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
        >
          <Upload className="mr-2 h-4 w-4" />
          {value ? "Substituir" : "Enviar imagem"}
        </Button>
        <span className="text-xs text-muted-foreground">{meta.hint}</span>
      </div>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Ou colar URL externa</summary>
        <Input
          className="mt-2"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="https://…"
          disabled={disabled || busy}
        />
      </details>
    </div>
  );
}

import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/lib/siteContent";

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  name: z.string().trim().max(120).optional(),
});

export function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const c = useSiteContent().newsletter;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, name: name || undefined });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert(parsed.data);
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info("Você já está inscrito 🎉");
      else toast.error("Não foi possível inscrever agora");
      return;
    }
    toast.success("Inscrição confirmada! Obrigado.");
    setEmail("");
    setName("");
  }

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-2" : "space-y-3"}>
      {!compact && (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={c.name_placeholder}
          maxLength={120}
        />
      )}
      <div className="flex gap-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={c.email_placeholder}
          maxLength={255}
        />
        <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          <span className="ml-1 hidden sm:inline">{c.button_label}</span>
        </Button>
      </div>
    </form>
  );
}

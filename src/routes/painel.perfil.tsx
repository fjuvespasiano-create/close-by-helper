import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/use-admin";
import { getMyProfile, upsertMyProfile } from "@/lib/panel";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/painel/perfil")({
  component: PanelPerfil,
});

function PanelPerfil() {
  const { userId } = useAdmin();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["my-profile", userId], queryFn: () => getMyProfile(userId!), enabled: !!userId });
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (profile.data) {
      const p = profile.data as { name: string | null; avatar_url: string | null };
      setName(p.name ?? "");
      setAvatar(p.avatar_url ?? "");
    }
  }, [profile.data]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await upsertMyProfile(userId, { name: name.trim() || null, avatar_url: avatar.trim() || null });
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Você saiu");
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-2xl font-bold">Meu perfil</h1>
      <p className="text-sm text-muted-foreground">Atualize seus dados pessoais.</p>

      <form onSubmit={save} className="mt-6 space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <Label>E-mail</Label>
          <Input value={email ?? ""} disabled />
        </div>
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="avatar">Foto (URL)</Label>
          <Input id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://" />
          {avatar ? <img src={avatar} alt="" className="mt-2 h-16 w-16 rounded-full object-cover" /> : null}
        </div>
        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={signOut}>Sair da conta</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </div>
      </form>
    </div>
  );
}

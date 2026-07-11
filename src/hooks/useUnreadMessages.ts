import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserId } from "@/lib/favorites";

/**
 * Retorna o número total de mensagens NÃO LIDAS destinadas ao usuário atual,
 * em qualquer conversa do marketplace. Atualiza em tempo real via Supabase Realtime.
 *
 * Usado no nav do painel para mostrar um badge próximo a "Mensagens".
 */
export function useUnreadMessagesCount(): number {
  const userId = useCurrentUserId();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["mk", "unread-count", userId],
    enabled: !!userId,
    queryFn: async (): Promise<number> => {
      // Mensagens direcionadas ao usuário (ele é comprador OU vendedor da thread)
      // e cujo remetente NÃO é ele próprio e ainda não foram lidas.
      const { count, error } = await supabase
        .from("listing_messages")
        .select("id", { count: "exact", head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .neq("sender_id", userId!)
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!userId) return;
    // Escuta qualquer alteração em listing_messages e revalida o contador.
    // O filtro por usuário é feito na query — o canal escuta tudo (RLS
    // garante que só recebemos linhas que podemos ler).
    const channel = supabase
      .channel(`mk-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listing_messages" },
        () => {
          qc.invalidateQueries({ queryKey: ["mk", "unread-count", userId] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  return data ?? 0;
}

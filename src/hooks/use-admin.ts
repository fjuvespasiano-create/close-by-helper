import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/admin";

export function useAdmin() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let currentUid: string | null = null;

    const evaluate = (uid: string | null) => {
      if (!mounted) return;
      // Skip if same user — avoids re-checking admin role on every token refresh.
      if (uid === currentUid) {
        setLoading(false);
        return;
      }
      currentUid = uid;
      setUserId(uid);
      if (!uid) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      checkIsAdmin(uid)
        .then((ok) => {
          if (!mounted || currentUid !== uid) return;
          setIsAdmin(ok);
        })
        .catch(() => {
          if (!mounted || currentUid !== uid) return;
          setIsAdmin(false);
        })
        .finally(() => {
          if (!mounted) return;
          setLoading(false);
        });
    };

    // onAuthStateChange fires INITIAL_SESSION on subscribe — no separate
    // getSession() call needed, which removes the double-fire race.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      evaluate(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, isAdmin, userId };
}

// Public VAPID key — safe to expose to the browser (that's the whole point).
// Paired with server-side VAPID_PRIVATE_KEY (secret).
export const VAPID_PUBLIC_KEY =
  "BD2I3H4esBIRpwD9M3hnUHPLW-QiNAwyJRVNfv5WI-gYO_8g73RMxoGbx1AuFj0R_vxwMxPsqHF1x5eKPVohEf8";

export const NOTIFICATION_CATEGORIES = [
  { key: "promocao", label: "Promoções", emoji: "🎉" },
  { key: "novidade", label: "Novidades", emoji: "🚀" },
  { key: "evento", label: "Eventos", emoji: "📅" },
  { key: "sistema", label: "Sistema", emoji: "📢" },
  { key: "empresa", label: "Empresas", emoji: "⭐" },
  { key: "noticias", label: "Notícias", emoji: "📰" },
  { key: "blog", label: "Blog", emoji: "✍️" },
  { key: "marketplace", label: "Marketplace", emoji: "🛒" },
  { key: "manutencao", label: "Manutenção", emoji: "⚠️" },
  { key: "emergencia", label: "Emergência", emoji: "🚨" },
  { key: "geral", label: "Geral", emoji: "🔔" },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["key"];

// Public VAPID key — safe to expose to the browser (that's the whole point).
// Paired with server-side VAPID_PRIVATE_KEY (secret). MUST bater com o par no backend.
export const VAPID_PUBLIC_KEY =
  "BGy1egLnuC9d2mMd-poJQFGUGRJpx62hNsP6b_5V9l8YYbuZyHXi_7UHKUewiqsWKxwieK9XuiMs3Nkufs-gIC0";

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

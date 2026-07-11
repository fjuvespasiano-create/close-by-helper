/* AgendaAqui Service Worker — PWA offline + push notifications */
const VERSION = 'v1.2.0';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const IMAGE_CACHE = `images-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ---------- Install ----------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

// ---------- Activate — cleanup old caches ----------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => ![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(k)).map((k) => caches.delete(k))
      );
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch {}
      }
      await self.clients.claim();
    })()
  );
});

// ---------- Fetch strategies ----------
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !/\.(png|jpg|jpeg|webp|svg|gif|ico|woff2?)$/i.test(url.pathname)) return;
  // Never cache API/tracking calls
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const fresh = await fetch(req);
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match(OFFLINE_URL);
      }
    })());
    return;
  }

  if (req.destination === 'image') {
    event.respondWith(caches.open(IMAGE_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch { return cached || new Response('', { status: 504 }); }
    }));
    return;
  }

  if (['style', 'script', 'font'].includes(req.destination)) {
    event.respondWith(caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    }));
    return;
  }
});

// ---------- Push notifications ----------
function track(deliveryId, event, token) {
  if (!deliveryId || !token) return Promise.resolve();
  return fetch('/api/public/push/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delivery_id: deliveryId, event, token }),
    keepalive: true,
  }).catch(() => {});
}

const HIGH_ALERT_VIBRATE = [300, 100, 300, 100, 500];

async function notifyClientsPlaySound(soundUrl) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      c.postMessage({ type: 'PLAY_ALERT_SOUND', url: soundUrl || '/alert.mp3' });
    }
  } catch {}
}

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: 'AgendaAqui', body: event.data ? event.data.text() : '' }; }

  const isHigh = data.priority === 'high' || data.critical === true;
  const title = data.title || (isHigh ? 'Novo Alerta Crítico!' : 'AgendaAqui');
  const actions = Array.isArray(data.buttons)
    ? data.buttons.slice(0, 2).map((b, i) => ({ action: `btn_${i}`, title: b.label || `Ação ${i + 1}` }))
    : [];

  const vibrate = data.vibrate === false
    ? undefined
    : (isHigh ? HIGH_ALERT_VIBRATE : (Array.isArray(data.vibrate) ? data.vibrate : [120, 60, 120]));

  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    image: data.image,
    tag: data.tag || `agendaaqui-${isHigh ? 'high-' : ''}${data.notification_id || Date.now()}`,
    renotify: isHigh ? true : !!data.renotify,
    data: {
      url: data.url || '/',
      notification_id: data.notification_id,
      delivery_id: data.delivery_id,
      delivery_token: data.delivery_token,
      buttons: Array.isArray(data.buttons) ? data.buttons : [],
      priority: isHigh ? 'high' : 'normal',
      sound: data.sound || (isHigh ? '/alert.mp3' : undefined),
    },
    vibrate,
    silent: data.silent === true,
    requireInteraction: isHigh ? true : !!data.requireInteraction,
    actions,
  };

  const tasks = [
    self.registration.showNotification(title, options),
    track(data.delivery_id, 'delivered', data.delivery_token),
  ];
  if (isHigh && data.silent !== true) tasks.push(notifyClientsPlaySound(options.data.sound));
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener('notificationclick', (event) => {
  const d = event.notification.data || {};
  event.notification.close();
  let target = d.url || '/';
  if (event.action && event.action.startsWith('btn_')) {
    const idx = Number(event.action.slice(4));
    const b = (d.buttons || [])[idx];
    if (b && b.url) target = b.url;
  }
  event.waitUntil((async () => {
    await track(d.delivery_id, 'clicked', d.delivery_token);
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        try { await client.focus(); } catch {}
        if ('navigate' in client) { try { await client.navigate(target); } catch {} }
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

// B2/B3: subscription rotation. `oldSubscription.options` frequentemente é null
// em navegadores modernos — reconstruímos com a chave VAPID pública do app.
const VAPID_PUB = 'BGy1egLnuC9d2mMd-poJQFGUGRJpx62hNsP6b_5V9l8YYbuZyHXi_7UHKUewiqsWKxwieK9XuiMs3Nkufs-gIC0';
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    try {
      const options = (event.oldSubscription && event.oldSubscription.options)
        ? event.oldSubscription.options
        : { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUB) };
      const newSub = await self.registration.pushManager.subscribe(options);
      const oldEndpoint = event.oldSubscription && event.oldSubscription.endpoint;
      if (!oldEndpoint) return;
      // Persistir a nova assinatura no backend (mesmo user_id da antiga).
      await fetch('/api/public/push/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          old_endpoint: oldEndpoint,
          new_subscription: {
            endpoint: newSub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(newSub.getKey('p256dh')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
              auth: btoa(String.fromCharCode(...new Uint8Array(newSub.getKey('auth')))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
            },
          },
        }),
      });
    } catch (err) {
      console.error('[sw] pushsubscriptionchange failed', err);
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

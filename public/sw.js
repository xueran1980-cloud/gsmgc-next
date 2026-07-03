// GSMGC Service Worker — PWA Offline Support
// 策略：Network First（API/页面实时优先）+ Cache First（静态资源秒开）

const CACHE_STATIC = 'gsmgc-static-v2';
const CACHE_PAGES = 'gsmgc-pages-v2';
const CACHE_API = 'gsmgc-api-v2';

const STATIC_EXT = ['.js', '.css', '.woff2', '.svg', '.png', '.jpg', '.ico'];

// ── Install: 预缓存关键静态资源 ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      return cache.addAll([
        '/',
        '/favicon.svg',
        '/icon-192.png',
        '/icon-512.png',
        '/manifest.json',
        '/product-placeholder.svg',
      ]).catch(() => { /* 非关键，失败不阻塞 */ });
    })
  );
  self.skipWaiting();
});

// ── Activate: 清理旧缓存 ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k.startsWith('gsmgc-') && ![CACHE_STATIC, CACHE_PAGES, CACHE_API].includes(k))
          .map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: 智能路由 ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理 GET 请求
  if (request.method !== 'GET') return;

  // 不拦截 Chrome 扩展请求
  if (url.protocol === 'chrome-extension:') return;

  // 同域请求才处理
  if (url.origin !== self.location.origin && url.origin !== 'https://api.gsmgc.es') {
    return; // DIAG: 非同域请求不处理, 不记录
  }

  // [DIAG] 记录所有拦截的请求
  console.log('[SW] intercept:', request.method, url.href);

  // ★ API 请求：Network First（实时数据优先）
  if (url.pathname.includes('/wp-json/') || url.pathname.includes('/api/')) {
    console.log('[SW] strategy: networkFirst API', url.href);
    event.respondWith(
      networkFirst(request, CACHE_API).then(r => {
        console.log('[SW] respond:', r.status, url.href);
        return r;
      }).catch(err => {
        console.log('[SW] error:', err, url.href);
        throw err;
      })
    );
    return;
  }

  // ★ 静态资源：Cache First（秒开）
  if (STATIC_EXT.some(ext => url.pathname.endsWith(ext))) {
    console.log('[SW] strategy: cacheFirst STATIC', url.href);
    event.respondWith(
      cacheFirst(request, CACHE_STATIC).then(r => {
        console.log('[SW] respond:', r.status, url.href);
        return r;
      }).catch(err => {
        console.log('[SW] error:', err, url.href);
        throw err;
      })
    );
    return;
  }

  // 同域请求才缓存
  if (url.origin !== self.location.origin && url.origin !== 'https://api.gsmgc.es') return;

  // ★ API 请求：Network First（实时数据优先）
  if (url.pathname.includes('/wp-json/') || url.pathname.includes('/api/')) {
    event.respondWith(networkFirst(request, CACHE_API));
    return;
  }

  // ★ 静态资源：Cache First（秒开）
  if (STATIC_EXT.some(ext => url.pathname.endsWith(ext))) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // ★ 页面 HTML：Network First（确保最新内容）
  if (request.headers.get('Accept')?.includes('text/html')) {
    console.log('[SW] strategy: networkFirst HTML', url.href);
    event.respondWith(
      networkFirst(request, CACHE_PAGES).then(r => {
        console.log('[SW] respond:', r.status, url.href);
        return r;
      }).catch(err => {
        console.log('[SW] error:', err, url.href);
        throw err;
      })
    );
    return;
  }

  // 默认：Network First
  console.log('[SW] strategy: networkFirst DEFAULT', url.href);
  event.respondWith(
    networkFirst(request, CACHE_PAGES).then(r => {
      console.log('[SW] respond:', r.status, url.href);
      return r;
    }).catch(err => {
      console.log('[SW] error:', err, url.href);
      throw err;
    })
  );
});

// ── Cache First 策略 ──
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Sin conexión', { status: 503 });
  }
}

// ── Network First 策略 ──
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // 无缓存也无网络 → 离线提示页
    if (request.headers.get('Accept')?.includes('text/html')) {
      return new Response(OFFLINE_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }
    return new Response('Sin conexión', { status: 503 });
  }
}

// ── 离线兜底页面 ──
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GSMGC — Sin Conexión</title>
<style>
body{font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;text-align:center;padding:20px}
.card{background:white;border-radius:16px;padding:40px 30px;max-width:360px;width:100%;box-shadow:0 2px 12px rgba(0,0,0,0.08)}
h1{font-size:22px;color:#333;margin:16px 0 8px}
p{color:#666;font-size:14px;line-height:1.5;margin:0}
.btn{display:inline-block;margin-top:20px;padding:12px 28px;background:#2563eb;color:white;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px}
.icon{margin:0 auto;width:64px;height:64px;background:#e8edf5;border-radius:32px;display:flex;align-items:center;justify-content:center;font-size:32px}
</style>
</head>
<body>
<div class="card">
<div class="icon">📡</div>
<h1>Sin conexión</h1>
<p>No tienes conexión a internet. Vuelve a intentarlo cuando tengas señal.</p>
<a href="/" class="btn">Reintentar</a>
</div>
</body>
</html>`;

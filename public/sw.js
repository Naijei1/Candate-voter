const prefix = `the-vote:${self.registration.scope}:`;
const version = `${prefix}1:`;
const shell = `${version}shell`;
const assets = `${version}assets`;
const scope = new URL(self.registration.scope);
const map = 'geo/cd120/KY.json';
const pagePattern = /^(races|candidates)\/[A-Za-z0-9][A-Za-z0-9._:-]*\/?$/;

function relativePath(url) {
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return null;
  return url.pathname.slice(scope.pathname.length);
}

function staticAsset(url) {
  const path = relativePath(url);
  return path !== null && !url.search && (
    path === map || path === 'manifest.webmanifest' || path === 'video/vote-hero.jpg' ||
    /^(?:_next\/static\/|icons\/|photos\/)/.test(path)
  );
}

async function update(cache, url, html = false) {
  const response = await fetch(url, { credentials: 'omit', redirect: 'error', cache: html ? 'no-store' : 'default' });
  if (response.ok && (!html || response.headers.get('content-type')?.includes('text/html'))) {
    await cache.put(url, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(shell);
    const staticCache = await caches.open(assets);
    await Promise.allSettled([
      update(cache, scope.href, true),
      ...[map, 'manifest.webmanifest', 'video/vote-hero.jpg'].map((path) => update(staticCache, new URL(path, scope).href)),
    ]);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(prefix) && !name.startsWith(version)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Client-side route changes don't produce a document request. Save a public HTML
// snapshot of the most recently visited profile and race in separate cache slots.
let visits = Promise.resolve();
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'visit' || typeof event.source?.url !== 'string') return;
  const url = new URL(event.source.url);
  const route = pagePattern.exec(relativePath(url) ?? '');
  if (route || relativePath(url) === '') {
    url.search = '';
    url.hash = '';
    visits = visits.catch(() => {}).then(async () => {
      const cache = await caches.open(route ? `${version}${route[1]}` : shell);
      const response = await update(cache, url.href, true);
      if (!response.ok) return;
      await Promise.all((await cache.keys()).filter((key) => key.url !== url.href).map((key) => cache.delete(key)));
    });
    event.waitUntil(visits.catch(() => {}));
  }
  const resources = Array.isArray(event.data.resources) ? event.data.resources.slice(0, 100) : [];
  event.waitUntil((async () => {
    const cache = await caches.open(assets);
    await Promise.allSettled(resources.filter((entry) => typeof entry === 'string').map(async (entry) => {
      const asset = new URL(entry);
      if (staticAsset(asset) && !(await cache.match(asset.href))) await update(cache, asset.href);
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  const path = relativePath(url);
  if (path === null) return;

  if (request.mode === 'navigate' && (path === '' || pagePattern.test(path))) {
    const name = path === '' ? shell : `${version}${path.split('/')[0]}`;
    url.search = '';
    const cached = async () => (await caches.open(name)).match(url.href);
    event.respondWith(fetch(request).then(async (response) => {
      if (response.status >= 500) return (await cached()) ?? response;
      return response;
    }).catch(async () => (await cached()) ?? Response.error()));
  } else if (staticAsset(url)) {
    const cache = caches.open(assets);
    const network = cache.then((store) => update(store, url.href));
    event.waitUntil(network.catch(() => {}));
    event.respondWith(cache.then(async (store) => (await store.match(url.href)) ?? network));
  }
});

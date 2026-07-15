// FitMate 서비스 워커 — 배포 시 VERSION을 올려야 캐시가 갱신된다
const VERSION = 'fitmate-v4'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  // HTML은 네트워크 우선(항상 최신), 오프라인이면 캐시
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(e.request, copy))
          return res
        })
        .catch(() => caches.match(e.request)),
    )
    return
  }

  // 정적 자산은 캐시 우선 (파일명에 해시가 있어 안전)
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone()
          caches.open(VERSION).then((c) => c.put(e.request, copy))
          return res
        }),
    ),
  )
})

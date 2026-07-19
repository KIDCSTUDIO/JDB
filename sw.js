/* ══════════════════════════════════════
   产前样复核检点表生成器 — Service Worker
   离线缓存策略：缓存优先，断网也能用
   ══════════════════════════════════════ */

const CACHE_NAME = 'checklist-v1';
const FILES_TO_CACHE = [
  './index.html',
  './manifest.json',
  './sw.js',
  './icon.svg'
];

// 安装：预缓存所有核心文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(FILES_TO_CACHE);
    }).then(function() {
      return self.skipWaiting(); // 立即激活
    })
  );
});

// 激活：清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim(); // 立即接管页面
    })
  );
});

// 请求拦截：缓存优先，没网时用缓存兜底
self.addEventListener('fetch', function(event) {
  // 只拦截 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        // 缓存命中 → 直接返回（同时后台更新缓存）
        var fetched = fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function() {
          // 更新失败，无所谓
        });
        return cached;
      }
      // 缓存未命中 → 走网络
      return fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});

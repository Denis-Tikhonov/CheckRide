const CACHE_NAME = "checkride-rating";
const ASSETS = [
    "./",
    "./index.html",
    "./app.js",
    "./style.css",
    "./data.json",
    "./data_ffs.json",
    "html2pdf.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
];

// Установка: кешируем все файлы
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Активация: чистим старый кеш
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
        })
    );
});

// Запрос: сначала смотрим в кеш, потом в сеть
self.addEventListener("fetch", (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});

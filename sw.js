
const CACHE="checkride-v4"

self.addEventListener("install",e=>{
e.waitUntil(
caches.open(CACHE).then(c=>c.addAll([
"/",
"/index.html",
"/app.js",
"/style.css",
"/data.json"
]))
)
})

self.addEventListener("fetch",e=>{
e.respondWith(
caches.match(e.request).then(r=>r||fetch(e.request))
)
})

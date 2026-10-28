const CACHE='latam-v4';
const ASSETS=['./','./index.html','./app.js?v=4','./phrases.json','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
  const clients=await self.clients.matchAll({type:'window'});
  await Promise.all(clients.map(client=>client.navigate(client.url).catch(()=>{})));
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const request=event.request;
 if(request.mode==='navigate'||new URL(request.url).pathname.endsWith('/app.js')){
  event.respondWith((async()=>{
   try{
    const response=await fetch(request,{cache:'no-store'});
    if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone())}
    return response;
   }catch{
    return await caches.match(request)||await caches.match('./index.html')||Response.error();
   }
  })());
  return;
 }
 event.respondWith(caches.match(request).then(cached=>cached||fetch(request)));
});

// Notifications envoyées par Supabase quand l'autre ajoute, coche ou note une idée.
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { title: 'Threeofheart', body: event.data && event.data.text() } }
  event.waitUntil(Promise.all([
    self.registration.showNotification(d.title || 'Threeofheart', {
      body: d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag,
      data: { url: d.url || './' },
    }),
    // petite pastille sur l'icône de l'app
    self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => {}) : null,
  ]))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) if ('focus' in c) return c.focus()
    return self.clients.openWindow(event.notification.data && event.notification.data.url || './')
  })())
})

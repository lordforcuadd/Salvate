// Sálvate PWA — Background Push & Notification Service Worker
// Enables notifications and background seismic alerts even when the app/browser is completely closed

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: 'Sálvate • Alerta de Emergencia',
      body: event.data ? event.data.text() : 'Nueva alerta disponible en la red de emergencia.'
    };
  }

  const title = data.title || 'Sálvate • Alerta de Emergencia';
  const type = data.type || 'broadcast';
  const isSeismic = type === 'seismic';

  const options = {
    body: data.body || (isSeismic ? 'Sismo registrado en Perú.' : 'Alerta comunitaria recibida.'),
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: isSeismic ? [500, 200, 500, 200, 700] : (type === 'status' ? [200, 100, 200] : [150, 80, 150]),
    tag: data.tag || `salvate-${type}-${Date.now()}`,
    data: data.data || { url: '/', tab: data.tabToOpen || (isSeismic ? 'seismic' : 'dashboard') },
    requireInteraction: isSeismic || type === 'status' || type === 'hazard',
    renotify: true,
    actions: [
      { action: 'open', title: isSeismic ? 'Ver Radar Sísmico' : 'Ver Mensaje' },
      { action: 'dismiss', title: 'Entendido' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetTab = event.notification.data?.tab || 'dashboard';
  const targetUrl = `/?tab=${targetTab}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-seismic-alerts') {
    event.waitUntil(
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson')
        .then(res => res.json())
        .then(data => {
          if (!data || !data.features) return;
          // Filter recent Peru bounding box earthquakes with magnitude >= 3.5
          const peruEvents = data.features.filter(f => {
            const [lng, lat] = f.geometry.coordinates;
            const mag = f.properties.mag;
            return lat >= -18.5 && lat <= -0.03 && lng >= -81.5 && lng <= -68.5 && mag >= 3.5;
          });

          if (peruEvents.length > 0) {
            const newest = peruEvents[0];
            const eventAge = Date.now() - newest.properties.time;
            if (eventAge < 15 * 60 * 1000) { // younger than 15 min
              return self.registration.showNotification(`🌋 Sismo Detectado M${newest.properties.mag.toFixed(1)}`, {
                body: `${newest.properties.place} (Alerta de Emergencia Oficial)`,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                vibrate: [500, 200, 500, 200, 700],
                tag: `seismic-${newest.id}`,
                data: { tab: 'seismic' },
                requireInteraction: true
              });
            }
          }
        })
        .catch(() => {})
    );
  }
});

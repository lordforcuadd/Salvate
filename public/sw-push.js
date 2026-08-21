// Sálvate PWA — Background Push & Notification Service Worker
// Enables background push and seismic alerts when closed without duplicate banners

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
  const notifTag = data.tag || `salvate-${type}-${data.id || 'event'}`;

  const mag = Number(data.mag || data.magnitude || (data.data && (data.data.mag || data.data.magnitude)) || 4.0);
  let seismicVibration = [350, 150, 350];
  if (mag >= 6.0) {
    seismicVibration = [1000, 250, 1000, 250, 1500, 300, 2000];
  } else if (mag >= 4.5) {
    seismicVibration = [600, 200, 600, 200, 600];
  }

  const options = {
    body: data.body || (isSeismic ? 'Sismo registrado en Perú.' : 'Alerta comunitaria recibida.'),
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: isSeismic ? seismicVibration : (type === 'status' ? [200, 100, 200] : [150, 80, 150]),
    tag: notifTag,
    data: data.data || { url: '/', tab: data.tabToOpen || (isSeismic ? 'seismic' : 'dashboard'), mag },
    requireInteraction: isSeismic || type === 'status' || type === 'hazard',
    renotify: false,
    actions: [
      { action: 'open', title: isSeismic ? 'Ver Radar Sísmico' : 'Ver Mensaje' },
      { action: 'dismiss', title: 'Entendido' }
    ]
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const isForeground = (clientList || []).some(c => c.visibilityState === 'visible' || c.focused);
      // Suppress duplicate OS banner if app is currently visible/open in foreground (except critical seismic alarms)
      if (isForeground && !isSeismic) {
        return;
      }
      return self.registration.showNotification(title, options);
    })
  );
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
            if (eventAge < 2 * 60 * 60 * 1000) {
              const mag = newest.properties.mag;
              const isEarthquake = mag >= 6.0;
              const isModerate = mag >= 4.5 && mag < 6.0;
              const label = isEarthquake ? '🚨 ¡TERREMOTO DETECTADO!' : (isModerate ? '⚠️ ¡SISMO DETECTADO!' : '🔔 ¡TEMBLOR DETECTADO!');

              return self.registration.showNotification(`${label} M${mag.toFixed(1)}`, {
                body: `${newest.properties.place} (Prof: ${newest.geometry.coordinates[2] || 10} km)`,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                vibrate: mag >= 6.0 ? [1000, 250, 1000, 250, 1500, 300, 2000] : (mag >= 4.5 ? [600, 200, 600, 200, 600] : [350, 150, 350]),
                tag: `seismic-${newest.id}`,
                data: { tab: 'seismic', mag },
                requireInteraction: true,
                renotify: false
              });
            }
          }
        })
        .catch(() => {})
    );
  }
});

// Sálvate PWA — Background Push & Notification Service Worker
// Enables background push, emergency actions, smart coalescing, and auto token renewal

const VAPID_PUBLIC_KEY = 'BD56oYjLVWHxv7HRg1GG8KktbRVcqsShyYpMDcl-IyJrn0Gw1Syv8VZXOlI1Flaxue00Dt6dXFwUXaUXe7wzdyU';
const SUPABASE_URL = 'https://vnwpudichitahnugxach.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud3B1ZGljaGl0YWhudWd4YWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjMxNDgsImV4cCI6MjEwMjg5OTE0OH0.O1_fWJyuzLSdglYe0bHEhfu8ftVl6YVaK7W-AvRQZFQ';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {
      title: '🚨 Sálvate • Alerta de Emergencia',
      body: event.data ? event.data.text() : 'Alerta sísmica o comunitaria registrada en Perú.',
      type: 'seismic'
    };
  }

  const type = data.type || 'broadcast';
  const isSeismic = type === 'seismic';
  const isHazard = type === 'hazard';
  const isStatus = type === 'status';

  // Smart Coalescing & Tagging:
  // - Sismos: Unique timestamped tag (always alerts, never coalesced)
  // - Mensajes: Grouped by senderId (one card per conversation with renotify: true)
  // - Peligros: Grouped by hazard ID
  let notifTag = `salvate-seismic-${data.id || Date.now()}`;
  if (type === 'broadcast') {
    notifTag = `salvate-chat-${data.senderId || data.id || 'room'}`;
  } else if (isHazard) {
    notifTag = `salvate-hazard-${data.id || Date.now()}`;
  } else if (isStatus) {
    notifTag = `salvate-status-${data.userId || data.id || Date.now()}`;
  }

  const title = data.title || (isSeismic ? '🚨 ¡Alerta Sísmica!' : 'Sálvate • Alerta de Emergencia');
  const mag = Number(data.mag || data.magnitude || (data.data && (data.data.mag || data.data.magnitude)) || 4.0);

  let seismicVibration = [350, 150, 350];
  if (mag >= 6.0) {
    seismicVibration = [1000, 250, 1000, 250, 1500, 300, 2000];
  } else if (mag >= 4.5) {
    seismicVibration = [600, 200, 600, 200, 600];
  }

  // Dynamic Tactical Action Buttons on Lock Screen
  let actions = [
    { action: 'open_app', title: 'Abrir App' },
    { action: 'dismiss', title: 'Entendido' }
  ];

  if (isSeismic) {
    actions = [
      { action: 'view_radar', title: '🗺️ Ver Radar' },
      { action: 'quick_sos', title: '🚨 Reportar SOS' }
    ];
  } else if (type === 'broadcast') {
    actions = [
      { action: 'open_chat', title: '💬 Responder' },
      { action: 'dismiss', title: 'Entendido' }
    ];
  } else if (isHazard) {
    actions = [
      { action: 'view_hazard', title: '⚠️ Ver Mapa' },
      { action: 'dismiss', title: 'Entendido' }
    ];
  }

  const options = {
    body: data.body || (isSeismic ? 'Sismo registrado en Perú. Toca para ver telemetría.' : 'Alerta recibida en la red de emergencia.'),
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: isSeismic ? seismicVibration : (isStatus ? [200, 100, 200] : [150, 80, 150]),
    tag: notifTag,
    data: data.data || { url: '/', tab: data.tabToOpen || (isSeismic ? 'seismic' : 'dashboard'), mag },
    requireInteraction: true,
    renotify: true,
    silent: false,
    timestamp: Date.now(),
    actions
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

  let targetUrl = '/';
  if (event.action === 'quick_sos') {
    targetUrl = '/?tab=status&sos=true';
  } else if (event.action === 'view_radar') {
    targetUrl = '/?tab=seismic';
  } else if (event.action === 'open_chat') {
    targetUrl = '/?tab=broadcast';
  } else if (event.action === 'view_hazard') {
    targetUrl = '/?tab=hazards';
  } else {
    const targetTab = event.notification.data?.tab || 'dashboard';
    targetUrl = `/?tab=${targetTab}`;
  }

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

// Auto-Renew Token on Browser / FCM Expiry
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    }).then((newSub) => {
      const subJson = newSub.toJSON();
      return fetch(`${SUPABASE_URL}/rest/v1/salvate_push_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          endpoint: newSub.endpoint,
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
          updated_at: new Date().toISOString()
        })
      });
    }).catch((err) => {
      console.warn('Push subscription rotation notice:', err);
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
                tag: `salvate-seismic-${newest.id}`,
                data: { tab: 'seismic', mag },
                requireInteraction: true,
                renotify: true,
                silent: false,
                timestamp: Date.now(),
                actions: [
                  { action: 'view_radar', title: '🗺️ Ver Radar' },
                  { action: 'quick_sos', title: '🚨 Reportar SOS' }
                ]
              });
            }
          }
        })
        .catch(() => {})
    );
  }
});

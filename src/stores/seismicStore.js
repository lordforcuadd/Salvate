import { defineStore } from 'pinia';

export const useSeismicStore = defineStore('seismic', {
  state: () => ({
    allEvents: [],
    peruEvents: [],
    isLoading: false,
    activeSource: 'IGP • CENSIS Oficial',
    lastUpdated: null,
    pollingInterval: null,
    timeRange: '24h', // '24h' | '7d' | '30d'
    userCoords: null
  }),

  getters: {
    significantPeruEvent: (state) => {
      const peruList = state.peruEvents || [];
      if (peruList.length === 0) return null;
      return [...peruList].sort((a, b) => (b.magnitude || 0) - (a.magnitude || 0))[0];
    },
  },

  actions: {
    async initSeismicStore(userCoords = null) {
      if (userCoords) this.userCoords = userCoords;
      await this.fetchSeismicData(this.userCoords);

      if (!this.pollingInterval) {
        this.pollingInterval = setInterval(() => {
          this.fetchSeismicData(this.userCoords);
        }, 20000); // Live poll every 20 seconds
      }
    },

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },

    updateUserCoordsAndRecalculate(userCoords) {
      if (!userCoords) return;
      this.userCoords = userCoords;

      const recalculate = (evt) => {
        const distKm = Math.round(calculateHaversineDistance(userCoords.lat, userCoords.lng, evt.lat, evt.lng));
        const bearing = calculateBearing(userCoords.lat, userCoords.lng, evt.lat, evt.lng);
        return {
          ...evt,
          distanceKm: distKm,
          bearing,
          intensityDesc: evt.intensity || getIntensityDescription(evt.magnitude, distKm)
        };
      };

      this.peruEvents = this.peruEvents.map(recalculate);
      this.allEvents = this.allEvents.map(recalculate);
    },

    async setTimeRange(range) {
      this.timeRange = range;
      await this.fetchSeismicData(this.userCoords);
    },

    async fetchSeismicData(userCoords = null) {
      this.isLoading = true;
      const defaultUserCoords = userCoords || this.userCoords || { lat: -12.046374, lng: -77.042793 };

      let igpEvents = [];
      let emscEvents = [];
      let usgsEvents = [];

      // ─────────────────────────────────────────────────────────────────────────
      // 1. FUENTE PRINCIPAL: INSTITUTO GEOFÍSICO DEL PERÚ (IGP / CENSIS OFICIAL)
      // ─────────────────────────────────────────────────────────────────────────
      const limit = this.timeRange === '24h' ? 25 : (this.timeRange === '7d' ? 60 : 120);
      const igpQueryPath = `/query?where=1%3D1&outFields=*&f=json&orderByFields=objectid%20desc&resultRecordCount=${limit}`;
      const officialIgpUrl = `https://ide.igp.gob.pe/arcgis/rest/services/monitoreocensis/Sismicidad/MapServer/0${igpQueryPath}`;
      
      const igpUrlsToTry = [
        `/api/igp${igpQueryPath}`, // Vite Proxy (CORS-free en dev / local)
        officialIgpUrl, // Directo
        `https://api.allorigins.win/raw?url=${encodeURIComponent(officialIgpUrl)}` // Fallback CORS mirror
      ];

      for (const url of igpUrlsToTry) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
          if (res.ok) {
            const data = await res.json();
            const rawFeatures = data.features || [];
            if (rawFeatures.length > 0) {
              igpEvents = rawFeatures.map(feat => {
                const a = feat.attributes || {};
                const geom = feat.geometry || {};
                const lat = Number(a.lat !== undefined ? a.lat : geom.y);
                const lng = Number(a.lon !== undefined ? a.lon : geom.x);
                const mag = Number(a.magnitud || a.mag || 0);
                const depthKm = Number(a.prof || 0);

                // Normalizar timestamp exacto de Perú (corrigiendo el desfase de 5 horas de ArcGIS)
                const realTimeMs = parseIgpEventTimestamp(a);
                const distKm = Math.round(calculateHaversineDistance(defaultUserCoords.lat, defaultUserCoords.lng, lat, lng));
                const bearing = calculateBearing(defaultUserCoords.lat, defaultUserCoords.lng, lat, lng);
                const regionBadge = getIgpRegionBadge(a.departamento, a.ref);

                return {
                  id: `igp-${a.objectid || a.code || Math.random().toString(36).substr(2, 5)}`,
                  source: 'IGP / CENSIS Oficial Perú',
                  placeTitle: a.ref || (regionBadge ? `Epicentro en ${regionBadge}` : 'Territorio Peruano'),
                  regionBadge,
                  magnitude: mag,
                  time: realTimeMs,
                  formattedDateTime: formatPeruDateTime(realTimeMs),
                  formattedTime: a.hora || new Date(realTimeMs).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
                  timeAgo: formatTimeAgo(realTimeMs),
                  lat,
                  lng,
                  depthKm,
                  distanceKm: distKm,
                  bearing,
                  isPeru: true,
                  intensity: a.int_ || '',
                  felt: a.sentido === '1' || Boolean(a.int_),
                  reportCode: a.code || (a.reporte ? `Reporte N° ${a.reporte}` : ''),
                  intensityDesc: a.int_ ? a.int_ : getIntensityDescription(mag, distKm)
                };
              });
              this.activeSource = 'IGP / CENSIS (En Vivo)';
              break; // Éxito con IGP, salimos del bucle de reintento
            }
          }
        } catch (e) {
          // Intentar con siguiente URL de IGP
        }
      }

      // ─────────────────────────────────────────────────────────────────────────
      // 2. FUENTE SECUNDARIA EN TIEMPO REAL: EMSC (Red Sismológica Sudamericana)
      // ─────────────────────────────────────────────────────────────────────────
      try {
        const emscUrl = `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlat=-19.5&maxlat=0.5&minlon=-82.0&maxlon=-68.0&limit=${limit}`;
        const emscRes = await fetch(emscUrl, { signal: AbortSignal.timeout(5000) });
        if (emscRes.ok) {
          const emscData = await emscRes.json();
          const rawFeatures = emscData.features || [];
          emscEvents = rawFeatures.map(feat => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0, 0];
            const lng = coords[0];
            const lat = coords[1];
            const depthKm = Math.round(coords[2] || props.depth || 0);
            const mag = Number(props.mag || 0);
            const distKm = Math.round(calculateHaversineDistance(defaultUserCoords.lat, defaultUserCoords.lng, lat, lng));
            const bearing = calculateBearing(defaultUserCoords.lat, defaultUserCoords.lng, lat, lng);
            const isPeru = isPointInPeruBoundingBox(lat, lng);
            const { translatedPlace, regionBadge } = formatPeruPlaceTitle(props.flynn_region || props.place, lat, lng, isPeru);
            const realTimeMs = new Date(props.time).getTime();

            return {
              id: `emsc-${props.unid || feat.id}`,
              source: props.auth === 'IGP' ? 'IGP / CENSIS (vía EMSC)' : 'Red Sismológica EMSC',
              placeTitle: translatedPlace,
              regionBadge,
              magnitude: mag,
              time: realTimeMs,
              formattedDateTime: formatPeruDateTime(realTimeMs),
              formattedTime: new Date(realTimeMs).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
              timeAgo: formatTimeAgo(realTimeMs),
              lat,
              lng,
              depthKm,
              distanceKm: distKm,
              bearing,
              isPeru,
              intensity: '',
              felt: false,
              intensityDesc: getIntensityDescription(mag, distKm)
            };
          });
        }
      } catch (err) {}

      // ─────────────────────────────────────────────────────────────────────────
      // 3. FUENTE GLOBAL / DE RESPALDO: USGS (US Geological Survey GeoJSON Feed)
      // ─────────────────────────────────────────────────────────────────────────
      try {
        let usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
        if (this.timeRange === '7d') {
          usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';
        } else if (this.timeRange === '30d') {
          usgsUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson';
        }

        const usgsRes = await fetch(usgsUrl, { signal: AbortSignal.timeout(6000) });
        if (usgsRes.ok) {
          const usgsData = await usgsRes.json();
          const rawFeatures = usgsData.features || [];
          usgsEvents = rawFeatures.map(feat => {
            const props = feat.properties || {};
            const coords = feat.geometry?.coordinates || [0, 0, 0];
            const lng = coords[0];
            const lat = coords[1];
            const depthKm = Math.round(coords[2] || 0);
            const mag = Number(props.mag || 0);
            const distKm = Math.round(calculateHaversineDistance(defaultUserCoords.lat, defaultUserCoords.lng, lat, lng));
            const bearing = calculateBearing(defaultUserCoords.lat, defaultUserCoords.lng, lat, lng);
            const isPeru = isPointInPeruBoundingBox(lat, lng);
            const { translatedPlace, regionBadge } = formatPeruPlaceTitle(props.place, lat, lng, isPeru);
            const realTimeMs = new Date(props.time).getTime();

            return {
              id: `usgs-${feat.id}`,
              source: isPeru ? 'Monitoreo Sísmico Perú' : 'USGS Global',
              placeTitle: translatedPlace,
              regionBadge,
              magnitude: mag,
              time: realTimeMs,
              formattedDateTime: formatPeruDateTime(realTimeMs),
              formattedTime: new Date(realTimeMs).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
              timeAgo: formatTimeAgo(realTimeMs),
              lat,
              lng,
              depthKm,
              distanceKm: distKm,
              bearing,
              isPeru,
              intensity: '',
              felt: false,
              intensityDesc: getIntensityDescription(mag, distKm)
            };
          });
        }
      } catch (err) {}

      // ─────────────────────────────────────────────────────────────────────────
      // 4. UNIFICACIÓN Y DEDUPLICACIÓN INTELIGENTE (Prioridad IGP Oficial)
      // ─────────────────────────────────────────────────────────────────────────
      const allRawEvents = [...igpEvents, ...emscEvents, ...usgsEvents];

      // Filtrar según el timeRange seleccionado
      const nowMs = Date.now();
      const maxAgeHours = this.timeRange === '24h' ? 24 : (this.timeRange === '7d' ? 168 : 720);
      const maxAgeMs = maxAgeHours * 3600 * 1000;

      const filteredByTime = allRawEvents.filter(e => {
        const evtTime = new Date(e.time).getTime();
        return !isNaN(evtTime) && (nowMs - evtTime) <= maxAgeMs;
      });

      // Deduplicar eventos dentro de ±180s y distancia < 60km
      const deduplicatedList = [];
      for (const evt of filteredByTime) {
        const evtTime = new Date(evt.time).getTime();
        const duplicate = deduplicatedList.find(existing => {
          const exTime = new Date(existing.time).getTime();
          const timeDiff = Math.abs(evtTime - exTime);
          const distDiff = calculateHaversineDistance(evt.lat, evt.lng, existing.lat, existing.lng);
          return timeDiff < 180000 && distDiff < 60;
        });

        if (!duplicate) {
          deduplicatedList.push(evt);
        } else {
          // Si el duplicado nuevo es del IGP oficial, sobrescribir con los datos detallados del IGP
          if (evt.source.includes('IGP') && !duplicate.source.includes('IGP')) {
            const idx = deduplicatedList.indexOf(duplicate);
            deduplicatedList[idx] = evt;
          }
        }
      }

      // Separar eventos de Perú y eventos globales
      const peruOnly = deduplicatedList
        .filter(e => e.isPeru || isPointInPeruBoundingBox(e.lat, e.lng))
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

      const allSorted = [...deduplicatedList]
        .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

      this.peruEvents = peruOnly;
      this.allEvents = allSorted;
      this.lastUpdated = new Date().toISOString();
      this.isLoading = false;
    }
  }
});

function parseIgpEventTimestamp(a) {
  if (a.hora && a.fecha) {
    const d = new Date(a.fecha);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const isoStr = `${y}-${m}-${day}T${a.hora}-05:00`;
    const parsed = new Date(isoStr).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  if (a.fechaevento) {
    // IGP ArcGIS database stores local Peru wall-clock time as a naive UTC epoch (offset of +5h to get real UTC)
    return Number(a.fechaevento) + (5 * 3600 * 1000);
  }
  return Date.now();
}

function getIgpRegionBadge(departamento, ref) {
  const dep = (departamento || '').trim().toUpperCase();
  if (dep && dep !== 'OCEANO' && dep !== 'MAR' && dep !== 'PERU') {
    return `Región ${dep}`;
  }
  const peruDepartments = [
    'Lima', 'Callao', 'Arequipa', 'Ica', 'Moquegua', 'Tacna', 'Piura', 
    'Tumbes', 'Lambayeque', 'La Libertad', 'Áncash', 'Ancash', 'Cusco', 'Puno', 
    'Loreto', 'Ucayali', 'San Martín', 'Junín', 'Ayacucho', 'Huancavelica', 
    'Pasco', 'Huánuco', 'Amazonas', 'Cajamarca', 'Apurímac', 'Madre de Dios'
  ];
  if (ref) {
    for (const d of peruDepartments) {
      if (new RegExp(`\\b${d}\\b`, 'i').test(ref)) {
        return dep === 'OCEANO' ? `Región ${d.toUpperCase()} (Costa / Mar)` : `Región ${d.toUpperCase()}`;
      }
    }
  }
  return 'Costa / Mar Peruano';
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin((lon2 - lon1) * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180));
  const x = Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
            Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos((lon2 - lon1) * (Math.PI / 180));
  const brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  const index = Math.round(brng / 45) % 8;
  return directions[index];
}

function isPointInPeruBoundingBox(lat, lng) {
  // Approximate Peru & immediate coastal trench boundary: Lat 0.0 to -19.5, Lng -82.0 to -68.0
  return lat <= 0.2 && lat >= -19.5 && lng >= -82.0 && lng <= -68.0;
}

function formatPeruPlaceTitle(rawPlace, lat, lng, isPeru) {
  if (!rawPlace) return { translatedPlace: isPeru ? 'Territorio Peruano' : 'Región Global', regionBadge: isPeru ? 'Perú' : 'Global' };
  
  let translated = rawPlace
    .replace(/of/g, 'de')
    .replace(/,\s*Peru/i, ' - Perú')
    .replace(/,\s*Chile/i, ' - Chile')
    .replace(/,\s*Ecuador/i, ' - Ecuador')
    .replace(/,\s*Bolivia/i, ' - Bolivia')
    .replace(/km\s+SSW/i, 'km al SSO')
    .replace(/km\s+SW/i, 'km al SO')
    .replace(/km\s+WSW/i, 'km al OSO')
    .replace(/km\s+W/i, 'km al Oeste')
    .replace(/km\s+WNW/i, 'km al ONO')
    .replace(/km\s+NW/i, 'km al NO')
    .replace(/km\s+NNW/i, 'km al NNO')
    .replace(/km\s+N/i, 'km al Norte')
    .replace(/km\s+NNE/i, 'km al NNE')
    .replace(/km\s+NE/i, 'km al NE')
    .replace(/km\s+ENE/i, 'km al ENE')
    .replace(/km\s+E/i, 'km al Este')
    .replace(/km\s+ESE/i, 'km al ESE')
    .replace(/km\s+SE/i, 'km al SE')
    .replace(/km\s+SSE/i, 'km al SSE')
    .replace(/km\s+S/i, 'km al Sur');

  let regionBadge = isPeru ? 'Costa / Centro Perú' : 'Global';
  const peruDepartments = [
    'Lima', 'Callao', 'Arequipa', 'Ica', 'Moquegua', 'Tacna', 'Piura', 
    'Tumbes', 'Lambayeque', 'La Libertad', 'Áncash', 'Ancash', 'Cusco', 'Puno', 
    'Loreto', 'Ucayali', 'San Martín', 'Junín', 'Ayacucho', 'Huancavelica', 
    'Pasco', 'Huánuco', 'Amazonas', 'Cajamarca', 'Apurímac', 'Madre de Dios'
  ];

  for (const dep of peruDepartments) {
    if (new RegExp(`\\b${dep}\\b`, 'i').test(rawPlace)) {
      regionBadge = `Región ${dep.toUpperCase()}`;
      break;
    }
  }

  return { translatedPlace: translated, regionBadge };
}

function formatPeruDateTime(isoOrEpoch) {
  try {
    const d = new Date(isoOrEpoch);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (e) {
    return '';
  }
}

function formatTimeAgo(isoOrEpoch) {
  try {
    const diffMs = Date.now() - new Date(isoOrEpoch).getTime();
    if (diffMs < 0) return 'Hace un momento';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  } catch (e) {
    return '';
  }
}

function getIntensityDescription(mag, distKm) {
  if (mag >= 7.0 && distKm < 150) return 'Muy Fuerte (Potencial Destructivo)';
  if (mag >= 6.0 && distKm < 100) return 'Fuerte (Sacudida Severa)';
  if (mag >= 5.0 && distKm < 80) return 'Moderado (Claramente Sentido)';
  if (distKm < 50) return 'Sentido Leve en Epicentro';
  return 'No percibido en tu zona';
}

import { defineStore } from 'pinia';
import { useNotificationStore } from './notificationStore';

export const useSeismicStore = defineStore('seismic', {
  state: () => ({
    allEvents: [],
    peruEvents: [],
    isLoading: false,
    activeSource: 'IGP • CENSIS Oficial',
    lastUpdated: null,
    pollingInterval: null,
    timeRange: '24h', // '24h' | '7d' | '30d'
    userCoords: null,
    _isFirstFetch: true
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
        const telemetry = computeSeismicTelemetry({
          mag: evt.magnitude,
          depthKm: evt.depthKm,
          distKm,
          bearing,
          intensity: evt.intensity,
          felt: evt.felt,
          source: evt.source,
          isPeru: evt.isPeru
        });

        return {
          ...evt,
          distanceKm: distKm,
          bearing,
          classification: telemetry.classification,
          hypoDistKm: telemetry.hypoDistKm,
          perceptionTag: telemetry.perceptionTag,
          depthTag: telemetry.depthTag,
          proximityText: telemetry.proximityText,
          intensityDesc: telemetry.intensityDesc
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
        `/api/igp${igpQueryPath}`, // Vite Proxy / Hosting rewrite (CORS-free)
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
                const felt = a.sentido === '1' || Boolean(a.int_);
                const intensity = (a.int_ || '').trim();

                const telemetry = computeSeismicTelemetry({
                  mag,
                  depthKm,
                  distKm,
                  bearing,
                  intensity,
                  felt,
                  source: 'IGP / CENSIS',
                  isPeru: true
                });

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
                  intensity,
                  felt,
                  reportCode: a.code || (a.reporte ? `Reporte N° ${a.reporte}` : ''),
                  classification: telemetry.classification,
                  hypoDistKm: telemetry.hypoDistKm,
                  perceptionTag: telemetry.perceptionTag,
                  depthTag: telemetry.depthTag,
                  proximityText: telemetry.proximityText,
                  intensityDesc: telemetry.intensityDesc
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

            const telemetry = computeSeismicTelemetry({
              mag,
              depthKm,
              distKm,
              bearing,
              intensity: '',
              felt: false,
              source: 'EMSC',
              isPeru
            });

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
              classification: telemetry.classification,
              hypoDistKm: telemetry.hypoDistKm,
              perceptionTag: telemetry.perceptionTag,
              depthTag: telemetry.depthTag,
              proximityText: telemetry.proximityText,
              intensityDesc: telemetry.intensityDesc
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

            const telemetry = computeSeismicTelemetry({
              mag,
              depthKm,
              distKm,
              bearing,
              intensity: '',
              felt: false,
              source: 'USGS',
              isPeru
            });

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
              classification: telemetry.classification,
              hypoDistKm: telemetry.hypoDistKm,
              perceptionTag: telemetry.perceptionTag,
              depthTag: telemetry.depthTag,
              proximityText: telemetry.proximityText,
              intensityDesc: telemetry.intensityDesc
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

      const notifStore = useNotificationStore();

      // On initial page load, mark all current historical events as seen so reloading the app never triggers past notifications
      if (this._isFirstFetch) {
        this._isFirstFetch = false;
        peruOnly.forEach(evt => {
          if (evt.id && !notifStore.notifiedEventIds.includes(evt.id)) {
            notifStore.notifiedEventIds.push(evt.id);
          }
        });
        if (notifStore.notifiedEventIds.length > 50) {
          notifStore.notifiedEventIds = notifStore.notifiedEventIds.slice(-50);
        }
        try {
          localStorage.setItem('salvate_notified_events', JSON.stringify(notifStore.notifiedEventIds));
        } catch (e) {}
      } else {
        // Only during active live polling, detect FRESH earthquakes (< 3 min) that occurred while using the app
        if (peruOnly.length > 0) {
          const newest = peruOnly[0];
          const eventAgeMs = Date.now() - new Date(newest.time).getTime();
          if (eventAgeMs >= 0 && eventAgeMs < 180000 && (newest.magnitude >= 3.5 || newest.felt)) {
            if (!notifStore.notifiedEventIds.includes(newest.id)) {
              const classLabel = newest.classification?.label || 'SISMO';
              notifStore.notify({
                type: 'seismic',
                title: `Alerta: ${classLabel} M${newest.magnitude.toFixed(1)}`,
                body: `${newest.placeTitle} (Prof: ${newest.depthKm} km)`,
                id: newest.id,
                tabToOpen: 'seismic'
              });
            }
          }
        }
      }
    }
  }
});

export function computeSeismicTelemetry({ mag, depthKm, distKm, bearing, intensity, felt, source, isPeru }) {
  // 1. Technical Classification (Sismo vs Terremoto vs Temblor)
  let classification = {
    label: 'TEMBLOR LEVE',
    shortLabel: 'Temblor',
    type: 'minor',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-black',
    isEarthquake: false,
    severityLevel: 1
  };

  if (mag >= 7.0) {
    classification = {
      label: 'TERREMOTO MAYOR',
      shortLabel: 'Terremoto Mayor',
      type: 'catastrophic',
      badgeClass: 'bg-rose-600/30 text-rose-300 border-rose-500/60 font-black animate-pulse',
      isEarthquake: true,
      severityLevel: 4
    };
  } else if (mag >= 6.0) {
    classification = {
      label: 'TERREMOTO',
      shortLabel: 'Terremoto',
      type: 'earthquake',
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-black',
      isEarthquake: true,
      severityLevel: 3
    };
  } else if (mag >= 4.5) {
    classification = {
      label: 'SISMO MODERADO',
      shortLabel: 'Sismo',
      type: 'moderate',
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold',
      isEarthquake: false,
      severityLevel: 2
    };
  }

  // 2. Hypocentral distance (3D Euclidean distance considering focal depth)
  const hypoDistKm = Math.round(Math.sqrt((distKm * distKm) + (depthKm * depthKm)));

  // 3. Perception / Felt Analysis (Natural, accessible language)
  let perceptionTag = null;
  const intensityClean = (intensity || '').trim();

  if (hypoDistKm <= 75 && mag >= 4.8) {
    perceptionTag = {
      label: 'Sentido Fuerte en tu zona',
      level: 'strong',
      variant: 'danger',
      iconName: 'AlertTriangle'
    };
  } else if (hypoDistKm <= 140 && mag >= 4.0) {
    perceptionTag = {
      label: 'Sentido Moderado en tu zona',
      level: 'moderate',
      variant: 'warning',
      iconName: 'Zap'
    };
  } else if (hypoDistKm <= 260 && mag >= 4.2) {
    perceptionTag = {
      label: 'Sentido Leve en tu zona',
      level: 'mild',
      variant: 'info',
      iconName: 'Activity'
    };
  } else if (intensityClean) {
    perceptionTag = {
      label: `Se sintió en: ${intensityClean}`,
      level: 'reported',
      variant: 'warning',
      iconName: 'Activity'
    };
  } else if (felt) {
    perceptionTag = {
      label: 'Reportado sentido en epicentro',
      level: 'reported',
      variant: 'warning',
      iconName: 'Activity'
    };
  }

  // 4. Depth Classification Tag (Natural terms)
  let depthTag = {
    label: `Superficial (${depthKm} km)`,
    level: 'shallow',
    iconName: 'Waves',
    isShallow: true,
    desc: 'Cercano a la superficie (mayor energía en suelo)'
  };

  if (depthKm > 300) {
    depthTag = {
      label: `Muy Profundo (${depthKm} km)`,
      level: 'deep',
      iconName: 'ArrowDownCircle',
      isShallow: false,
      desc: 'Gran profundidad en el manto'
    };
  } else if (depthKm > 60) {
    depthTag = {
      label: `Profundidad Media (${depthKm} km)`,
      level: 'intermediate',
      iconName: 'Layers',
      isShallow: false,
      desc: 'Profundidad intermedia en la placa de Nazca'
    };
  }

  // 5. Natural Cardinal Direction & Proximity text
  const directionText = getCardinalDirectionText(bearing);
  const proximityText = `A ${distKm} km ${directionText} de ti`;

  // 6. Descriptive Intensity & Physical Effects (Clear human language)
  let intensityDesc = '';
  if (intensityClean) {
    intensityDesc = `Reporte oficial: ${intensityClean}`;
  } else if (hypoDistKm <= 60 && mag >= 6.0) {
    intensityDesc = 'Peligro de sacudida muy fuerte y daños';
  } else if (hypoDistKm <= 80 && mag >= 5.0) {
    intensityDesc = 'Sacudida fuerte perceptible en tu zona';
  } else if (hypoDistKm <= 150 && mag >= 4.5) {
    intensityDesc = 'Sacudida moderada (los objetos pueden oscilar)';
  } else if (hypoDistKm <= 250 && mag >= 4.0) {
    intensityDesc = 'Sacudida leve (perceptible en reposo)';
  } else {
    intensityDesc = 'Sin percepción estimada en tu ubicación';
  }

  return {
    classification,
    hypoDistKm,
    perceptionTag,
    depthTag,
    proximityText,
    intensityDesc
  };
}

export function getCardinalDirectionText(bearingCode) {
  const map = {
    'N': 'al Norte',
    'NE': 'al Noreste',
    'ENE': 'al Este-Noreste',
    'E': 'al Este',
    'ESE': 'al Este-Sureste',
    'SE': 'al Sureste',
    'SSE': 'al Sur-Sureste',
    'S': 'al Sur',
    'SSO': 'al Sur-Suroeste',
    'SO': 'al Suroeste',
    'OSO': 'al Oeste-Suroeste',
    'O': 'al Oeste',
    'ONO': 'al Oeste-Noroeste',
    'NO': 'al Noroeste',
    'NNO': 'al Norte-Noroeste',
    'NNE': 'al Norte-Noreste'
  };
  return map[bearingCode] || (bearingCode ? `en dirección ${bearingCode}` : 'cerca');
}

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

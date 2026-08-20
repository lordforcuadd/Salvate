<template>
  <div class="glass-card p-4 sm:p-6 border border-zinc-800 space-y-5">
    
    <!-- Component Header (IGP Peru Official Theme) -->
    <div class="flex flex-col gap-2 pb-4 border-b border-zinc-800">
      <div class="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Activity class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h3 class="text-base sm:text-lg font-black text-zinc-100 truncate">
              Sismos en Perú • IGP / CENSIS
            </h3>
            <p class="text-xs text-zinc-400 truncate">Monitoreo sísmico nacional en tiempo real con epicentros por departamento</p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="h-8 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Forzar actualización en tiempo real del IGP"
            :disabled="seismicStore.isLoading"
            @click="refreshDataNow"
          >
            <RefreshCw :class="['w-3.5 h-3.5 shrink-0', seismicStore.isLoading ? 'animate-spin' : '']" />
            <span class="hidden xs:inline">{{ seismicStore.isLoading ? 'Actualizando...' : 'Actualizar' }}</span>
          </button>

          <AppBadge 
            :variant="seismicStore.isLoading ? 'warning' : 'safe'" 
            size="sm" 
            :dot="true"
          >
            {{ seismicStore.isLoading ? 'Sincronizando...' : seismicStore.activeSource }}
          </AppBadge>
        </div>
      </div>
    </div>

    <!-- Summary Metrics Grid (Arriba del todo) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-center shadow-sm">
        <div class="text-xl sm:text-2xl font-black text-amber-400">{{ (seismicStore.allEvents || []).length }}</div>
        <div class="text-xs uppercase font-bold tracking-wider text-zinc-300 mt-1 whitespace-nowrap">Eventos Registrados</div>
      </div>
      <div class="p-3.5 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 text-center shadow-sm">
        <div class="text-xl sm:text-2xl font-black text-emerald-400">{{ (seismicStore.peruEvents || []).length }}</div>
        <div class="text-xs uppercase font-bold tracking-wider text-emerald-300 mt-1 whitespace-nowrap">Sismos Perú (IGP)</div>
      </div>
      <div class="p-3.5 rounded-2xl bg-zinc-900/90 border border-teal-500/30 text-center shadow-sm">
        <div class="text-xl sm:text-2xl font-black text-teal-400">
          {{ seismicStore.significantPeruEvent ? 'M ' + seismicStore.significantPeruEvent.magnitude : 'Ninguno' }}
        </div>
        <div class="text-xs uppercase font-bold tracking-wider text-teal-300 mt-1 whitespace-nowrap">
          Sismo Mayor ({{ getTimeRangeLabel(seismicStore.timeRange) }})
        </div>
      </div>
    </div>

    <!-- Multi-Timeframe & Scope Filter Controls (Arriba del todo) -->
    <div class="space-y-2.5 bg-zinc-900/95 p-3 sm:p-4 rounded-2xl border border-zinc-800">
      
      <!-- Top Row: Geographic Scope (Peru vs Global) & Auto-update -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button 
            type="button"
            :class="[
              'h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex flex-row items-center justify-center shrink-0 cursor-pointer',
              filterMode === 'peru' ? 'bg-emerald-500 text-zinc-950 shadow-md font-black' : 'text-zinc-400 hover:text-zinc-200'
            ]"
            @click="filterMode = 'peru'" 
          >
            Perú y Fronteras ({{ (seismicStore.peruEvents || []).length }})
          </button>

          <button 
            type="button"
            :class="[
              'h-8 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex flex-row items-center justify-center shrink-0 cursor-pointer',
              filterMode === 'all' ? 'bg-emerald-500 text-zinc-950 shadow-md font-black' : 'text-zinc-400 hover:text-zinc-200'
            ]"
            @click="filterMode = 'all'" 
          >
            Sudamérica y Global ({{ (seismicStore.allEvents || []).length }})
          </button>
        </div>

        <div class="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300/90 shrink-0 px-1">
          <RefreshCw class="w-3.5 h-3.5 text-emerald-400 animate-spin-slow shrink-0" />
          <span>Actualiza cada 20s</span>
        </div>
      </div>

      <!-- Bottom Row: Time Range Selector (24 Horas, 7 Días, 30 Días) -->
      <div class="flex items-center gap-2 pt-2 border-t border-zinc-800 flex-wrap">
        <span class="text-xs font-bold text-zinc-400 flex items-center gap-1 mr-1">
          <Calendar class="w-3.5 h-3.5 text-zinc-400" />
          Periodo:
        </span>

        <button
          type="button"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
            seismicStore.timeRange === '24h' ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
          ]"
          @click="seismicStore.setTimeRange('24h')"
        >
          Últimas 24 Horas
        </button>

        <button
          type="button"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
            seismicStore.timeRange === '7d' ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
          ]"
          @click="seismicStore.setTimeRange('7d')"
        >
          Últimos 7 Días
        </button>

        <button
          type="button"
          :class="[
            'px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer',
            seismicStore.timeRange === '30d' ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 bg-zinc-950/60'
          ]"
          @click="seismicStore.setTimeRange('30d')"
        >
          Últimos 30 Días
        </button>
      </div>

    </div>

    <!-- Map Action Bar (Directamente ARRIBA del mapa) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800">
      <div class="flex items-center gap-2 min-w-0">
        <MapPin class="w-4 h-4 text-emerald-400 shrink-0" />
        <div class="min-w-0">
          <span class="text-xs font-bold text-zinc-200">Mapa Telúrico Interactivo</span>
          <span class="text-[11px] text-zinc-400 ml-2 font-mono hidden xs:inline truncate">
            Posición: {{ userLocationSummary }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 w-full sm:w-auto">
        <!-- Mi Ubicación Button -->
        <button 
          type="button"
          :disabled="isLocating"
          class="flex-1 sm:flex-none h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/15 cursor-pointer active:scale-95 disabled:opacity-60 whitespace-nowrap"
          title="Detectar y centrar el mapa en mi ubicación actual"
          @click="centerOnUser"
        >
          <Target :class="['w-3.5 h-3.5 shrink-0', isLocating ? 'animate-spin' : '']" />
          <span>{{ isLocating ? 'Obteniendo GPS...' : 'Mi Ubicación' }}</span>
        </button>

        <!-- Reset Zoom (Ver Todo el Perú) -->
        <button 
          type="button"
          class="h-8 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          title="Ver mapa completo del Perú"
          @click="resetPeruMapView"
        >
          <Compass class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span class="hidden sm:inline">Ver Perú</span>
        </button>
      </div>
    </div>

    <!-- Leaflet Standard Clear Map -->
    <div class="relative w-full h-[320px] sm:h-[380px] rounded-2xl overflow-hidden border border-zinc-800 shadow-inner">
      <div id="seismic-map" class="w-full h-full"></div>
    </div>

    <!-- Seismic Events Detailed Feed -->
    <div class="space-y-3">
      
      <!-- Section Header -->
      <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-zinc-800">
        <h4 class="text-xs font-black text-zinc-200 uppercase tracking-wider">
          Reportes Sísmicos Oficiales Detallados
        </h4>

        <!-- Color Legend (Temblor vs Sismo vs Terremoto) -->
        <div class="flex items-center gap-3 text-[11px] font-bold text-zinc-300">
          <span class="flex items-center gap-1 text-emerald-400">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> M&lt;4.5 Temblor Leve
          </span>
          <span class="flex items-center gap-1 text-amber-400">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> M4.5-5.9 Sismo Moderado
          </span>
          <span class="flex items-center gap-1 text-rose-400">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> M&ge;6.0 Terremoto
          </span>
        </div>
      </div>

      <!-- Events Scrollable Container -->
      <div class="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
        <div v-if="(displayedEvents || []).length === 0" class="text-center py-8 text-zinc-500 text-xs italic">
          No hay registros telúricos para el periodo seleccionado ({{ getTimeRangeLabel(seismicStore.timeRange) }}).
        </div>

        <div 
          v-for="event in displayedEvents" 
          :key="event.id"
          class="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 shadow-md"
        >
          <!-- Top Row: Magnitude Badge + Title & Badges + Action -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              
              <!-- Magnitude Badge -->
              <div :class="['w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black shrink-0 shadow-md', getMagnitudeStyle(event.magnitude)]">
                <span class="text-[10px] font-extrabold leading-none opacity-90">M</span>
                <span class="text-base font-black leading-none mt-0.5">{{ event.magnitude.toFixed(1) }}</span>
              </div>

              <div class="space-y-1 min-w-0 flex-1">
                <!-- Title & Region Badges + Classification + Reactive Telemetry -->
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- Technical Classification (Terremoto / Sismo / Temblor) -->
                  <span 
                    v-if="event.classification" 
                    :class="['px-2 py-0.5 rounded-lg text-[10px] uppercase border shrink-0', event.classification.badgeClass]"
                  >
                    {{ event.classification.label }}
                  </span>

                  <h5 class="text-xs sm:text-sm font-bold text-zinc-100 leading-snug truncate">{{ event.placeTitle }}</h5>
                  
                  <AppBadge variant="warning" size="xs">
                    {{ event.regionBadge || 'Región Perú' }}
                  </AppBadge>

                  <AppBadge :variant="event.source.includes('IGP') ? 'safe' : 'neutral'" size="xs">
                    {{ event.source }}
                  </AppBadge>

                  <!-- Reactive Perception Tag (No Emojis - Lucide Icons) -->
                  <span 
                    v-if="event.perceptionTag" 
                    :class="['px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 shrink-0', getPerceptionTagClass(event.perceptionTag.variant)]"
                  >
                    <component :is="getPerceptionIcon(event.perceptionTag.iconName)" class="w-3.5 h-3.5 shrink-0" />
                    <span>{{ event.perceptionTag.label }}</span>
                  </span>

                  <!-- Reactive Depth Tag -->
                  <span 
                    v-if="event.depthTag" 
                    class="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-zinc-950 border border-zinc-800 text-zinc-300 flex items-center gap-1 shrink-0"
                    :title="event.depthTag.desc"
                  >
                    <component :is="getDepthIcon(event.depthTag.iconName)" class="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{{ event.depthTag.label }}</span>
                  </span>

                  <span v-if="event.reportCode" class="text-[10px] font-mono text-zinc-400 font-bold px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                    {{ event.reportCode }}
                  </span>
                </div>

                <!-- Complete Date, Time & Depth Metrics -->
                <div class="flex items-center gap-3 text-xs text-zinc-300 font-medium flex-wrap pt-0.5">
                  <span class="flex items-center gap-1.5 text-zinc-200">
                    <Clock class="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span class="text-zinc-400 font-medium">{{ event.timeAgo }}</span>
                    <span class="text-amber-300 font-mono text-xs font-bold">({{ event.formattedDateTime }})</span>
                  </span>
                  <span>Profundidad: <strong class="text-zinc-100 font-bold">{{ event.depthKm }} km</strong></span>
                </div>
              </div>

            </div>

            <!-- View Epicenter Action Button -->
            <button 
              type="button"
              class="h-8 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex flex-row items-center justify-center gap-1.5 transition-all whitespace-nowrap shrink-0 shadow-sm cursor-pointer active:scale-95"
              title="Centrar en el mapa"
              @click="focusEventOnMap(event)"
            >
              <Compass class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span class="hidden sm:inline">Ver Epicentro</span>
            </button>
          </div>

          <!-- Bottom Row: Distance from User & Physical Felt Intensity Analysis -->
          <div class="p-3 rounded-xl bg-black border border-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div class="flex items-center gap-2">
              <Compass class="w-4 h-4 text-emerald-400 shrink-0" />
              <span class="text-zinc-200">
                A <strong class="text-amber-400 font-bold">{{ event.distanceKm }} km</strong> en dirección <strong class="text-zinc-100 font-bold">{{ event.bearing }}</strong> de tu posición.
              </span>
            </div>

            <div class="flex items-center gap-1.5 text-zinc-300 text-[11px] font-semibold">
              <span class="text-zinc-400">Intensidad:</span>
              <span class="text-zinc-100">{{ event.intensityDesc }}</span>
            </div>
          </div>

        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useSeismicStore } from '../stores/seismicStore';
import { useAuthStore } from '../stores/authStore';
import AppBadge from './ui/AppBadge.vue';
import { 
  Activity, 
  Clock, 
  Compass, 
  RefreshCw, 
  Target, 
  Calendar, 
  MapPin,
  AlertTriangle,
  Zap,
  Waves,
  Layers,
  ArrowDownCircle
} from 'lucide-vue-next';
import L from 'leaflet';

const seismicStore = useSeismicStore();
const authStore = useAuthStore();

const filterMode = ref('peru');
const isLocating = ref(false);
let map = null;
let markersGroup = null;
let userMarker = null;

const getPerceptionIcon = (iconName) => {
  if (iconName === 'AlertTriangle') return AlertTriangle;
  if (iconName === 'Zap') return Zap;
  return Activity;
};

const getDepthIcon = (iconName) => {
  if (iconName === 'ArrowDownCircle') return ArrowDownCircle;
  if (iconName === 'Layers') return Layers;
  return Waves;
};

const getPerceptionTagClass = (variant) => {
  if (variant === 'danger') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (variant === 'warning') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
};

const displayedEvents = computed(() => {
  const list = filterMode.value === 'peru' ? seismicStore.peruEvents : seismicStore.allEvents;
  return list || [];
});

const userLocationSummary = computed(() => {
  if (authStore.userCoords) {
    return `${authStore.userCoords.lat.toFixed(3)}, ${authStore.userCoords.lng.toFixed(3)}`;
  }
  return '-12.046, -77.042 (Lima)';
});

const getTimeRangeLabel = (range) => {
  if (range === '7d') return '7 días';
  if (range === '30d') return '30 días';
  return '24h';
};

const refreshDataNow = async () => {
  await seismicStore.fetchSeismicData(authStore.userCoords);
};

onMounted(async () => {
  if (!authStore.userCoords) {
    await authStore.captureInitialLocation();
  }
  await seismicStore.initSeismicStore(authStore.userCoords);
  await nextTick();
  initMap();
});

// Reactively update markers when displayed events change
watch(displayedEvents, () => {
  updateMapMarkers();
}, { deep: true });

// Reactively update user marker and recalculate seismic distances in-memory when user location changes
watch(() => authStore.userCoords, (newCoords) => {
  if (newCoords) {
    if (map) {
      updateUserMarker(newCoords.lat, newCoords.lng);
      map.setView([newCoords.lat, newCoords.lng], map.getZoom());
    }
    seismicStore.updateUserCoordsAndRecalculate(newCoords);
  }
}, { deep: true });

const initMap = () => {
  try {
    const mapElement = document.getElementById('seismic-map');
    if (!mapElement) return;

    if (map) {
      try { map.off(); map.remove(); } catch (e) {}
      map = null;
      userMarker = null;
    }

    const defaultLat = authStore.userCoords?.lat || -12.046374;
    const defaultLng = authStore.userCoords?.lng || -77.042793;

    map = L.map('seismic-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18
    }).addTo(map);

    markersGroup = L.layerGroup().addTo(map);

    // Create persistent user position marker (Emerald Glow Tone)
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 14px #10b981;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    userMarker = L.marker([defaultLat, defaultLng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>📍 Tu Ubicación Actual</b>');

    updateMapMarkers();
  } catch (err) {
    console.warn('Seismic Map init notice:', err);
  }
};

const updateUserMarker = (lat, lng) => {
  if (!map) return;
  if (userMarker) {
    userMarker.setLatLng([lat, lng]);
  } else {
    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 14px #10b981;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map);
  }
};

const updateMapMarkers = () => {
  if (!markersGroup) return;
  markersGroup.clearLayers();

  (displayedEvents.value || []).forEach(event => {
    const color = getMagnitudeColor(event.magnitude);
    const circle = L.circleMarker([event.lat, event.lng], {
      radius: Math.max(8, event.magnitude * 3),
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    });

    circle.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px; max-width: 220px; color: #f4f4f5;">
        <strong style="color: ${color}; font-size: 13px;">M ${event.magnitude.toFixed(1)} - ${event.placeTitle}</strong><br/>
        <span style="font-size: 11px; font-weight: bold; color: #a1a1aa;">${event.regionBadge || 'Región Perú'}</span><br/>
        <small style="color: #71717a;">Fecha: ${event.formattedDateTime || event.formattedTime}</small><br/>
        <small style="color: #71717a;">Fuente: ${event.source}</small><br/>
        <small style="color: #71717a;">Distancia: ${event.distanceKm} km (${event.bearing})</small><br/>
        <small style="color: #71717a;">Profundidad: ${event.depthKm} km</small>
      </div>
    `);

    markersGroup.addLayer(circle);
  });
};

const centerOnUser = () => {
  const currentLat = authStore.userCoords?.lat || -12.046374;
  const currentLng = authStore.userCoords?.lng || -77.042793;

  if (map) {
    map.setView([currentLat, currentLng], 12, { animate: true });
    updateUserMarker(currentLat, currentLng);
    if (userMarker) {
      userMarker.openPopup();
    }
  }

  if (navigator.geolocation) {
    isLocating.value = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        isLocating.value = false;
        const freshCoords = { 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude, 
          accuracy: Math.round(pos.coords.accuracy) 
        };
        authStore.setUserCoords(freshCoords);
        seismicStore.initSeismicStore(freshCoords);

        if (map) {
          map.setView([freshCoords.lat, freshCoords.lng], 12, { animate: true });
          updateUserMarker(freshCoords.lat, freshCoords.lng);
          if (userMarker) {
            userMarker.openPopup();
          }
        }
      },
      (err) => {
        isLocating.value = false;
        if (map && userMarker) {
          userMarker.openPopup();
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }
};

const resetPeruMapView = () => {
  if (!map) return;
  map.setView([-9.189967, -75.015152], 5, { animate: true });
};

const focusEventOnMap = (event) => {
  if (!map) return;
  map.setView([event.lat, event.lng], 9, { animate: true });
};

const getMagnitudeStyle = (mag) => {
  if (mag >= 6.0) return 'bg-rose-600 text-white border border-rose-400';
  if (mag >= 4.5) return 'bg-amber-500 text-zinc-950 border border-amber-400';
  return 'bg-emerald-500 text-zinc-950 border border-emerald-400';
};

const getMagnitudeColor = (mag) => {
  if (mag >= 6.0) return '#e11d48';
  if (mag >= 4.5) return '#f59e0b';
  return '#10b981';
};

onBeforeUnmount(() => {
  seismicStore.stopPolling();
  if (map) {
    try {
      map.off();
      map.remove();
    } catch (e) {}
    map = null;
    markersGroup = null;
    userMarker = null;
  }
});
</script>

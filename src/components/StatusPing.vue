<template>
  <div class="glass-card p-4 sm:p-6 border border-zinc-800 relative overflow-hidden space-y-5">
    
    <!-- Title & Current Status Display -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
      <div>
        <div class="flex items-center gap-2">
          <AppBadge variant="safe" size="xs">Reporte Inmediato</AppBadge>
          <h2 class="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
            <Activity class="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Reporta Tu Estado de Emergencia</span>
          </h2>
        </div>
        <p class="text-xs text-zinc-400 mt-1">Toca una opción para informar en tiempo real a tu familia y rescatistas.</p>
      </div>

      <!-- GPS & Location Picker Button -->
      <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
        <button 
          type="button"
          :disabled="isLocating"
          class="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-emerald-500/40 text-xs font-bold text-zinc-200 flex flex-row items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm active:scale-95"
          title="Ver o cambiar ubicación GPS"
          @click="showLocationModal = true"
        >
          <Navigation :class="['w-3.5 h-3.5 text-emerald-400 shrink-0', isLocating ? 'animate-spin' : '']" />
          <span>{{ gpsLocationText }}</span>
          <MapPin class="w-3 h-3 text-zinc-400 shrink-0" />
        </button>
      </div>
    </div>

    <!-- 3 Large Ergonomic Touch Buttons (Mobile-First) -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      
      <!-- 1. Estoy A Salvo (Emerald) -->
      <button
        type="button"
        :class="[
          'w-full p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all cursor-pointer flex items-center sm:flex-col justify-start sm:justify-center gap-3 text-left sm:text-center active:scale-[0.98]',
          authStore.userStatus === 'A salvo'
            ? 'bg-emerald-500 text-zinc-950 border-emerald-400 ring-2 ring-emerald-500/40 font-black shadow-emerald-500/20'
            : 'bg-zinc-900/90 hover:bg-emerald-500/15 text-zinc-100 border-zinc-800 hover:border-emerald-500/40'
        ]"
        @click="reportStatus('A salvo')"
      >
        <div :class="['w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-inner', authStore.userStatus === 'A salvo' ? 'bg-zinc-950/20 border-zinc-950/30 text-zinc-950' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400']">
          <CheckCircle2 class="w-5 h-5" />
        </div>
        <div class="min-w-0 flex-1 sm:flex-initial">
          <span class="block text-xs sm:text-sm font-black tracking-tight uppercase leading-snug">Estoy a Salvo</span>
          <span :class="['block text-[11px] font-medium leading-snug mt-0.5', authStore.userStatus === 'A salvo' ? 'text-zinc-900 font-bold' : 'text-zinc-400']">
            Sin lesiones • Lugar seguro
          </span>
        </div>
      </button>

      <!-- 2. En Traslado (Teal Sage) -->
      <button
        type="button"
        :class="[
          'w-full p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all cursor-pointer flex items-center sm:flex-col justify-start sm:justify-center gap-3 text-left sm:text-center active:scale-[0.98]',
          authStore.userStatus === 'En traslado'
            ? 'bg-teal-500 text-zinc-950 border-teal-400 ring-2 ring-teal-500/40 font-black shadow-teal-500/20'
            : 'bg-zinc-900/90 hover:bg-teal-500/15 text-zinc-100 border-zinc-800 hover:border-teal-500/40'
        ]"
        @click="reportStatus('En traslado')"
      >
        <div :class="['w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-inner', authStore.userStatus === 'En traslado' ? 'bg-zinc-950/20 border-zinc-950/30 text-zinc-950' : 'bg-teal-500/15 border-teal-500/30 text-teal-400']">
          <Footprints class="w-5 h-5" />
        </div>
        <div class="min-w-0 flex-1 sm:flex-initial">
          <span class="block text-xs sm:text-sm font-black tracking-tight uppercase leading-snug">En Traslado</span>
          <span :class="['block text-[11px] font-medium leading-snug mt-0.5', authStore.userStatus === 'En traslado' ? 'text-zinc-900 font-bold' : 'text-zinc-400']">
            Evacuando a zona segura
          </span>
        </div>
      </button>

      <!-- 3. Necesito Ayuda (Terracotta Rose) -->
      <button
        type="button"
        :class="[
          'w-full p-3.5 sm:p-4 rounded-2xl border shadow-sm transition-all cursor-pointer flex items-center sm:flex-col justify-start sm:justify-center gap-3 text-left sm:text-center active:scale-[0.98] animate-subtle-pulse',
          authStore.userStatus === 'Requiere ayuda'
            ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-500/40 font-black shadow-rose-600/30'
            : 'bg-zinc-900/90 hover:bg-rose-500/15 text-zinc-100 border-zinc-800 hover:border-rose-500/40'
        ]"
        @click="reportStatus('Requiere ayuda')"
      >
        <div :class="['w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-inner', authStore.userStatus === 'Requiere ayuda' ? 'bg-white/20 border-white/30 text-white' : 'bg-rose-500/15 border-rose-500/30 text-rose-400']">
          <AlertTriangle class="w-5 h-5" />
        </div>
        <div class="min-w-0 flex-1 sm:flex-initial">
          <span class="block text-xs sm:text-sm font-black tracking-tight uppercase leading-snug">Necesito Ayuda</span>
          <span :class="['block text-[11px] font-medium leading-snug mt-0.5', authStore.userStatus === 'Requiere ayuda' ? 'text-rose-100 font-bold' : 'text-zinc-400']">
            Herido o atrapado • SOS
          </span>
        </div>
      </button>

    </div>

    <!-- PINGS HISTORY LOG FEED (Shows only other peers' pings) -->
    <div class="p-4 rounded-2xl bg-zinc-900/95 border border-zinc-800 space-y-3">
      <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
        <h4 class="text-xs font-black text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
          <Clock class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Pings Recibidos de Contactos</span>
        </h4>
        <AppBadge variant="neutral" size="xs">{{ peerPingHistory.length }} Registros</AppBadge>
      </div>

      <div class="space-y-2 max-h-[190px] overflow-y-auto pr-1">
        <div v-if="peerPingHistory.length === 0" class="text-center py-5 text-zinc-500 text-xs italic">
          No hay pings recibidos de tus contactos aún. Cuando otros celulares reporten su estado por la red en malla, aparecerán aquí.
        </div>

        <div 
          v-for="entry in peerPingHistory" 
          :key="entry.id"
          class="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <AppBadge :variant="getBadgeVariant(entry.status)" size="xs">
              {{ entry.status }}
            </AppBadge>
            <span class="font-bold text-zinc-100 truncate">{{ entry.userName }}</span>
          </div>

          <div class="flex items-center gap-2 text-zinc-400 shrink-0">
            <span v-if="entry.coords" class="font-mono text-[10px] hidden sm:inline">
              GPS: {{ entry.coords.lat.toFixed(3) }}, {{ entry.coords.lng.toFixed(3) }}
            </span>
            <span class="font-mono text-emerald-400 font-bold bg-black px-2 py-0.5 rounded-lg border border-zinc-800 text-[11px]">
              {{ formatExactTime(entry.timestamp) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Offline SMS Action Bar (Clean Horizontal Layout) -->
    <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <MessageSquare class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h4 class="text-xs sm:text-sm font-bold text-zinc-100 truncate">Enviar Mensaje SMS (Sin Internet)</h4>
          <p class="text-[11px] text-zinc-400 leading-snug">
            Abre tu aplicación de SMS nativa con tus coordenadas GPS listas para enviar.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm flex flex-row items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-95 shrink-0 w-full sm:w-auto cursor-pointer whitespace-nowrap"
        @click="triggerSMSFallback"
      >
        <Send class="w-4 h-4 shrink-0" />
        <span>Enviar SMS con GPS</span>
      </button>
    </div>

    <!-- Peru Linea 119 Voice Emergency Protocol Instructivo -->
    <div class="p-4 rounded-2xl bg-zinc-900/95 border border-zinc-800 space-y-2.5">
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <PhoneCall class="w-4 h-4 text-emerald-400 shrink-0" />
          <h4 class="text-xs font-black text-zinc-200 uppercase tracking-wider">
            Línea Gratuita de Voz 119 (Perú)
          </h4>
        </div>
        <a 
          href="tel:119"
          class="h-8 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex flex-row items-center gap-1.5 transition-all whitespace-nowrap shrink-0"
        >
          <Phone class="w-3.5 h-3.5 shrink-0" />
          <span>Llamar 119</span>
        </a>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300 pt-1">
        <div class="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span class="font-bold text-emerald-400 block">DEJAR mensaje a tu familia:</span>
          <p class="text-[11px] text-zinc-400 mt-0.5">
            Marca <strong>119 + 1 + tu número celular</strong>.
          </p>
        </div>
        <div class="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <span class="font-bold text-teal-400 block">ESCUCHAR mensaje de tu familiar:</span>
          <p class="text-[11px] text-zinc-400 mt-0.5">
            Marca <strong>119 + 2 + celular de tu familiar</strong>.
          </p>
        </div>
      </div>
    </div>

    <!-- Location & Region Selection Modal -->
    <AppModal
      v-model="showLocationModal"
      title="Ubicación y Posición GPS"
      subtitle="Define tu ubicación para cálculo de distancias sísmicas y rescate"
      max-width="md"
    >
      <div class="space-y-3.5 text-xs text-zinc-300 py-1">
        
        <!-- Live GPS Detector Action -->
        <button
          type="button"
          :disabled="isLocating"
          class="w-full p-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold flex items-center justify-between gap-3 transition-all cursor-pointer active:scale-95 disabled:opacity-50 shadow-sm"
          @click="captureGPS(true)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Navigation :class="['w-5 h-5', isLocating ? 'animate-spin' : '']" />
            </div>
            <div class="text-left">
              <h5 class="text-sm font-black text-zinc-100">Detectar mi GPS en Vivo</h5>
              <p class="text-[11px] text-zinc-400 mt-0.5">Usa el sensor satelital de tu dispositivo</p>
            </div>
          </div>
          <span class="text-xs font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-xl whitespace-nowrap">
            {{ isLocating ? 'Detectando...' : 'Obtener' }}
          </span>
        </button>

        <!-- Current Location Display -->
        <div class="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <MapPin class="w-4 h-4 text-emerald-400 shrink-0" />
            <span class="font-bold text-zinc-200">Ubicación actual:</span>
          </div>
          <span class="font-mono text-emerald-400 font-bold">{{ gpsLocationText }}</span>
        </div>

        <!-- Quick Peruvian Regional Presets -->
        <div>
          <label class="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            O selecciona tu Región / Departamento:
          </label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="region in peruvianRegions"
              :key="region.name"
              type="button"
              class="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-emerald-500/20 border border-zinc-700 hover:border-emerald-500/40 text-left transition-all cursor-pointer active:scale-95 flex flex-col justify-center"
              @click="selectRegion(region)"
            >
              <span class="text-xs font-bold text-zinc-100">{{ region.name }}</span>
              <span class="text-[10px] text-zinc-400 font-mono">{{ region.lat.toFixed(2) }}, {{ region.lng.toFixed(2) }}</span>
            </button>
          </div>
        </div>

      </div>

      <template #footer>
        <button
          type="button"
          class="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer"
          @click="showLocationModal = false"
        >
          Cerrar
        </button>
      </template>
    </AppModal>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useMeshStore } from '../stores/meshStore';
import AppBadge from './ui/AppBadge.vue';
import AppModal from './ui/AppModal.vue';
import { 
  Activity, 
  Navigation, 
  CheckCircle2, 
  Footprints, 
  AlertTriangle, 
  MessageSquare, 
  Send, 
  PhoneCall, 
  Phone, 
  Clock,
  MapPin
} from 'lucide-vue-next';

const authStore = useAuthStore();
const meshStore = useMeshStore();

const isLocating = ref(false);
const showLocationModal = ref(false);
const currentCoords = ref(authStore.userCoords || { lat: -12.046374, lng: -77.042793, accuracy: 50 });
const gpsLocationText = ref(authStore.userCoords ? `GPS: ${authStore.userCoords.lat.toFixed(2)}, ${authStore.userCoords.lng.toFixed(2)}` : 'Detectando GPS...');

watch(() => authStore.userCoords, (newCoords) => {
  if (newCoords) {
    currentCoords.value = newCoords;
    gpsLocationText.value = `GPS: ${newCoords.lat.toFixed(2)}, ${newCoords.lng.toFixed(2)}`;
  }
}, { deep: true });

const peruvianRegions = [
  { name: 'Lima', lat: -12.046374, lng: -77.042793 },
  { name: 'Piura', lat: -5.194490, lng: -80.632820 },
  { name: 'Arequipa', lat: -16.409047, lng: -71.537451 },
  { name: 'Cusco', lat: -13.531950, lng: -71.967463 },
  { name: 'La Libertad', lat: -8.115990, lng: -79.029980 },
  { name: 'Tacna', lat: -18.006568, lng: -70.246274 },
  { name: 'Lambayeque', lat: -6.771370, lng: -79.840880 },
  { name: 'Loreto', lat: -3.749120, lng: -73.253830 },
  { name: 'Junín', lat: -12.065130, lng: -75.204860 },
  { name: 'Ica', lat: -14.067770, lng: -75.728610 },
  { name: 'Ancash', lat: -9.527790, lng: -77.527780 },
  { name: 'Puno', lat: -15.842200, lng: -70.021880 }
];

const peerPingHistory = computed(() => {
  return (meshStore.pingHistory || []).filter(entry => entry.userId !== authStore.userId);
});

onMounted(() => {
  if (authStore.userCoords) {
    currentCoords.value = authStore.userCoords;
    gpsLocationText.value = `GPS: ${authStore.userCoords.lat.toFixed(2)}, ${authStore.userCoords.lng.toFixed(2)}`;
  } else {
    captureGPS();
  }
});

const captureGPS = (isUserInitiated = false) => {
  if (!('geolocation' in navigator)) {
    gpsLocationText.value = 'GPS no disponible';
    return;
  }

  isLocating.value = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      isLocating.value = false;
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) };
      currentCoords.value = coords;
      gpsLocationText.value = `GPS: ${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
      authStore.setUserCoords(coords);
      if (isUserInitiated) {
        showLocationModal.value = false;
      }
    },
    (err) => {
      isLocating.value = false;
      if (!currentCoords.value) {
        currentCoords.value = { lat: -12.046374, lng: -77.042793, accuracy: 100 };
        gpsLocationText.value = 'Lima Centro';
        authStore.setUserCoords(currentCoords.value);
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
};

const selectRegion = (region) => {
  const coords = { lat: region.lat, lng: region.lng, accuracy: 50 };
  currentCoords.value = coords;
  gpsLocationText.value = `${region.name} (${region.lat.toFixed(2)}, ${region.lng.toFixed(2)})`;
  authStore.setUserCoords(coords);
  showLocationModal.value = false;
};

const reportStatus = async (status) => {
  authStore.updateUserStatus(status, currentCoords.value);
  
  if (authStore.user) {
    await meshStore.sendStatusPingToMesh(authStore.user);
  }

  if (!navigator.onLine || status === 'Requiere ayuda') {
    triggerSMSFallback();
  }
};

const triggerSMSFallback = () => {
  try {
    const status = authStore.userStatus;
    const name = authStore.userName || 'Usuario Sálvate';
    const latStr = currentCoords.value ? currentCoords.value.lat.toFixed(5) : '-12.0463';
    const lngStr = currentCoords.value ? currentCoords.value.lng.toFixed(5) : '-77.0427';
    
    const payload = `[EMERGENCIA SALVATE PERU] Estado: ${status.toUpperCase()} | Nombre: ${name} | GPS: https://maps.google.com/?q=${latStr},${lngStr}`;
    
    const smsUrl = `sms:?body=${encodeURIComponent(payload)}`;
    window.location.href = smsUrl;
  } catch (e) {
    console.warn('SMS protocol not supported or canceled on this device:', e);
  }
};

const getBadgeVariant = (status) => {
  if (status === 'A salvo') return 'safe';
  if (status === 'En traslado') return 'transit';
  return 'danger';
};

const formatExactTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
</script>

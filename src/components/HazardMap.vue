<template>
  <div class="glass-card p-4 sm:p-6 border border-zinc-800 space-y-4">
    
    <!-- Component Header (Hazard Warning Theme) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
      <div class="min-w-0">
        <h3 class="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
          <AlertTriangle class="w-5 h-5 text-amber-400 shrink-0" />
          <span class="truncate">Mapa de Peligros y Vías Bloqueadas</span>
        </h3>
        <p class="text-xs text-zinc-400 mt-0.5">Coordenadas exactas de derrumbes, fugas de gas o bloqueos de carreteras.</p>
      </div>

      <!-- Actions (Clean Flex Row) -->
      <div class="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
        <button 
          type="button"
          class="h-9 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex flex-row items-center gap-1.5 transition-all whitespace-nowrap active:scale-95 shadow-sm cursor-pointer shrink-0"
          title="Centrar en mi ubicación GPS"
          @click="centerOnUser"
        >
          <Target class="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Mi Ubicación</span>
        </button>

        <button
          type="button"
          class="h-9 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex flex-row items-center gap-1.5 transition-all shadow-md shadow-rose-600/25 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          @click="showFormModal = true"
        >
          <Plus class="w-4 h-4 shrink-0" />
          <span>Reportar Peligro</span>
        </button>
      </div>
    </div>

    <!-- Summary Stats Bar (3 Responsive Columns without Text Overflow) -->
    <div class="grid grid-cols-3 gap-2 sm:gap-3">
      <div class="p-2.5 sm:p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center flex flex-col items-center justify-center">
        <div class="text-lg sm:text-xl font-black text-amber-400 leading-none mb-1">{{ hazardStore.landslideCount }}</div>
        <div class="text-[9px] sm:text-xs uppercase font-bold text-amber-300 leading-tight">Derrumbes</div>
      </div>
      <div class="p-2.5 sm:p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center flex flex-col items-center justify-center">
        <div class="text-lg sm:text-xl font-black text-rose-400 leading-none mb-1">{{ hazardStore.gasLeakCount }}</div>
        <div class="text-[9px] sm:text-xs uppercase font-bold text-rose-300 leading-tight">Fugas de Gas</div>
      </div>
      <div class="p-2.5 sm:p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-center flex flex-col items-center justify-center">
        <div class="text-lg sm:text-xl font-black text-teal-400 leading-none mb-1">{{ hazardStore.roadBlockCount }}</div>
        <div class="text-[9px] sm:text-xs uppercase font-bold text-teal-300 leading-tight">Vías Bloqueadas</div>
      </div>
    </div>

    <!-- Leaflet Hazard Map Container -->
    <div class="relative w-full h-[280px] sm:h-[340px] rounded-2xl overflow-hidden border border-zinc-800 shadow-inner">
      <div id="hazard-map" class="w-full h-full"></div>
    </div>

    <!-- Hazards Detailed List Feed -->
    <div class="space-y-3">
      <h4 class="text-xs font-black text-zinc-300 uppercase tracking-wider">
        Alertas Registradas por la Comunidad ({{ hazardStore.activeHazards.length }})
      </h4>

      <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
        <div v-if="hazardStore.activeHazards.length === 0" class="text-center py-8 text-zinc-500 text-xs italic">
          No hay peligros ni bloqueos reportados en tu zona.
        </div>

        <div 
          v-for="h in hazardStore.activeHazards" 
          :key="h.id"
          class="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 shadow-md"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 shadow-md', getHazardTypeIconStyle(h.type)]">
                <AlertTriangle class="w-5 h-5" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <h5 class="text-xs sm:text-sm font-bold text-zinc-100 truncate">{{ h.title }}</h5>
                  <AppBadge :variant="h.severity === 'alta' ? 'danger' : 'warning'" size="xs">
                    Riesgo {{ h.severity }}
                  </AppBadge>
                </div>

                <p class="text-xs text-zinc-300 mt-1">{{ h.description }}</p>

                <div class="flex items-center gap-3 text-[11px] text-zinc-400 mt-1.5 font-medium">
                  <span>Por: <strong>{{ h.authorName }}</strong></span>
                  <span>{{ formatTime(h.timestamp) }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-1.5 shrink-0">
              <button 
                type="button"
                class="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold flex flex-row items-center gap-1 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                title="Centrar en el mapa"
                @click="focusHazardOnMap(h)"
              >
                <Compass class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ver Mapa</span>
              </button>

              <button 
                type="button"
                class="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer shrink-0"
                title="Marcar como resuelto"
                @click="hazardStore.removeHazard(h.id)"
              >
                <Check class="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

          <!-- Technical Metrics Row -->
          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-xs text-zinc-300">
            <div>
              <span class="text-[10px] text-zinc-400 font-bold block uppercase">Coordenadas del Incidente:</span>
              <p class="font-mono text-zinc-300 text-[11px] mt-0.5">{{ h.coords.lat.toFixed(4) }}, {{ h.coords.lng.toFixed(4) }}</p>
            </div>
            <div>
              <span class="text-[10px] text-zinc-400 font-bold block uppercase">Estado de Sincronización:</span>
              <p class="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{{ h.synced ? 'Verificado & Sincronizado' : 'Guardado Local Offline' }}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Hazard Form Modal -->
    <AppModal
      v-model="showFormModal"
      title="Reportar Peligro o Bloqueo"
      subtitle="Informa a la comunidad y a los equipos de auxilio"
      max-width="md"
    >
      <template #header-icon>
        <div class="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <AlertTriangle class="w-5 h-5" />
        </div>
      </template>

      <form @submit.prevent="submitReport" class="space-y-4 text-xs">
        <div>
          <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Tipo de Peligro</label>
          <select v-model="form.type" required class="w-full p-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 text-sm font-medium focus:outline-none focus:border-emerald-500">
            <option value="landslide">Derrumbe o caída de piedras</option>
            <option value="gas_leak">Fuga de gas o químico</option>
            <option value="road_block">Vía o calle bloqueada</option>
            <option value="fire">Incendio o riesgo de fuego</option>
            <option value="electrical">Cables sueltos o riesgo eléctrico</option>
          </select>
        </div>

        <AppInput
          v-model="form.title"
          label="Título del Reporte"
          placeholder="Ej. Piedras bloqueando carril derecho"
          required
        />

        <div>
          <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Detalles / Referencias</label>
          <textarea 
            v-model="form.description" 
            rows="2" 
            placeholder="Explica la ubicación exacta para orientar a tus vecinos..." 
            class="w-full p-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 text-sm font-medium focus:outline-none focus:border-emerald-500"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Nivel de Riesgo</label>
          <select v-model="form.severity" class="w-full p-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 text-sm font-medium focus:outline-none focus:border-emerald-500">
            <option value="baja">Bajo (Precaución)</option>
            <option value="media">Medio (Peligro moderado)</option>
            <option value="alta">Alto (Peligro crítico inminente)</option>
          </select>
        </div>

        <div class="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px] flex items-center gap-2">
          <WifiOff class="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Si estás sin internet, se guardará en IndexedDB y se transmitirá por la red P2P en cadena.</span>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <AppButton type="button" variant="secondary" @click="showFormModal = false">
            Cancelar
          </AppButton>
          <AppButton 
            type="submit" 
            variant="danger" 
            :loading="isSubmitting"
            :disabled="isSubmitting || !form.title.trim()"
          >
            Guardar y Transmitir
          </AppButton>
        </div>
      </form>
    </AppModal>

  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { useHazardStore } from '../stores/hazardStore';
import { useAuthStore } from '../stores/authStore';
import AppBadge from './ui/AppBadge.vue';
import AppButton from './ui/AppButton.vue';
import AppModal from './ui/AppModal.vue';
import AppInput from './ui/AppInput.vue';
import { AlertTriangle, CheckCircle, Plus, Check, WifiOff, Target, Compass } from 'lucide-vue-next';
import L from 'leaflet';

const hazardStore = useHazardStore();
const authStore = useAuthStore();

const showFormModal = ref(false);
const isSubmitting = ref(false);

const form = ref({
  type: 'landslide',
  title: '',
  description: '',
  severity: 'alta'
});

let map = null;
let markersGroup = null;
let userMarker = null;

onMounted(async () => {
  await hazardStore.initHazardStore();
  await nextTick();
  initMap();
});

watch(() => hazardStore.activeHazards, () => {
  updateMapMarkers();
}, { deep: true });

const initMap = () => {
  try {
    const mapElement = document.getElementById('hazard-map');
    if (!mapElement) return;

    if (map) {
      try { map.off(); map.remove(); } catch (e) {}
      map = null;
    }

    const defaultLat = authStore.userCoords?.lat || -12.046374;
    const defaultLng = authStore.userCoords?.lng || -77.042793;

    map = L.map('hazard-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([defaultLat, defaultLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    markersGroup = L.layerGroup().addTo(map);

    const userIcon = L.divIcon({
      className: 'custom-user-marker-precise',
      html: `<div style="background-color: #10b981; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px #10b981;"></div>`,
      iconSize: [16, 16]
    });

    userMarker = L.marker([defaultLat, defaultLng], { icon: userIcon })
      .addTo(map)
      .bindPopup('<b>Tu Ubicación Actual</b>');

    updateMapMarkers();
  } catch (err) {
    console.warn('Hazard Map init notice:', err);
  }
};

const updateMapMarkers = () => {
  if (!markersGroup) return;
  markersGroup.clearLayers();

  hazardStore.activeHazards.forEach(h => {
    const color = h.type === 'gas_leak' || h.severity === 'alta' ? '#f43f5e' : '#f59e0b';
    
    const circle = L.circleMarker([h.coords.lat, h.coords.lng], {
      radius: 10,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    });

    circle.bindPopup(`
      <div style="font-family: sans-serif; padding: 4px; max-width: 200px; color: #f4f4f5;">
        <strong style="color: ${color}; font-size: 13px;">${h.title}</strong><br/>
        <span style="font-size: 12px;">${h.description}</span><br/>
        <small style="color: #a1a1aa;">Coordenadas: ${h.coords.lat.toFixed(4)}, ${h.coords.lng.toFixed(4)}</small>
      </div>
    `);

    markersGroup.addLayer(circle);
  });
};

const centerOnUser = () => {
  const targetLat = authStore.userCoords?.lat || -12.046374;
  const targetLng = authStore.userCoords?.lng || -77.042793;

  if (map) {
    map.setView([targetLat, targetLng], 15, { animate: true });
    if (userMarker) {
      userMarker.setLatLng([targetLat, targetLng]);
      userMarker.openPopup();
    }
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const freshCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        authStore.userCoords = freshCoords;

        if (map) {
          map.setView([freshCoords.lat, freshCoords.lng], 15, { animate: true });
          if (userMarker) {
            userMarker.setLatLng([freshCoords.lat, freshCoords.lng]);
          }
        }
      },
      (err) => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }
};

const focusHazardOnMap = (h) => {
  if (!map || !h || !h.coords) return;
  map.setView([h.coords.lat, h.coords.lng], 16, { animate: true });

  if (markersGroup) {
    markersGroup.eachLayer((layer) => {
      const latLng = layer.getLatLng();
      if (Math.abs(latLng.lat - h.coords.lat) < 0.0001 && Math.abs(latLng.lng - h.coords.lng) < 0.0001) {
        layer.openPopup();
      }
    });
  }
};

const submitReport = async () => {
  if (!form.value.title.trim() || isSubmitting.value) return;

  isSubmitting.value = true;

  try {
    await hazardStore.addHazardReport({
      type: form.value.type,
      title: form.value.title.trim(),
      description: form.value.description.trim(),
      severity: form.value.severity,
      coords: authStore.userCoords || { lat: -12.046374, lng: -77.042793 },
      authorName: authStore.userName || 'Usuario Sálvate'
    });

    form.value = { type: 'landslide', title: '', description: '', severity: 'alta' };
    showFormModal.value = false;
    updateMapMarkers();
  } catch (err) {
    console.error('Error submitting report:', err);
  } finally {
    isSubmitting.value = false;
  }
};

const getHazardTypeIconStyle = (type) => {
  if (type === 'gas_leak') return 'bg-rose-500/20 text-rose-400';
  if (type === 'landslide') return 'bg-amber-500/20 text-amber-400';
  return 'bg-teal-500/20 text-teal-400';
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
</script>

<template>
  <div class="glass-card p-3.5 sm:p-5 border border-zinc-800 space-y-4">
    
    <!-- Component Header (Responsive Column on Mobile, Row on Tablet/Desktop) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Users class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-sm sm:text-base font-black text-zinc-100 truncate">Directorio de Contactos</h3>
          <p class="text-[11px] sm:text-xs text-zinc-400 truncate">Personas vinculadas en la red P2P local</p>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
        <button 
          type="button"
          class="h-9 px-2.5 sm:px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex flex-row items-center justify-center gap-1.5 transition-all border border-zinc-800 cursor-pointer active:scale-95 shrink-0"
          title="Limpiar cuentas inactivas de sesiones previas"
          @click="confirmCleanupInactives"
        >
          <RefreshCw class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span class="hidden xs:inline">Limpiar Inactivos</span>
        </button>

        <button 
          type="button"
          class="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex flex-row items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          @click="showConnectModal = true"
        >
          <Link class="w-3.5 h-3.5 shrink-0" />
          <span>Vincular Celular</span>
        </button>
      </div>
    </div>

    <!-- Status Summary Pills (3 Responsive Columns) -->
    <div class="grid grid-cols-3 gap-2">
      <div class="p-2 sm:p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
        <div class="text-base sm:text-lg font-black text-emerald-400">{{ meshStore.safeCount }}</div>
        <div class="text-[9px] sm:text-xs uppercase font-bold tracking-wider text-emerald-300 whitespace-nowrap">A salvo</div>
      </div>
      <div class="p-2 sm:p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-center">
        <div class="text-base sm:text-lg font-black text-teal-400">{{ meshStore.inTransitCount }}</div>
        <div class="text-[9px] sm:text-xs uppercase font-bold tracking-wider text-teal-300 whitespace-nowrap">En traslado</div>
      </div>
      <div class="p-2 sm:p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
        <div class="text-base sm:text-lg font-black text-rose-400">{{ meshStore.helpCount }}</div>
        <div class="text-[9px] sm:text-xs uppercase font-bold tracking-wider text-rose-300 whitespace-nowrap">Con ayuda</div>
      </div>
    </div>

    <!-- Users List Feed (Fully Responsive Card Row) -->
    <div class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
      <div v-if="meshStore.users.length === 0" class="text-center py-6 sm:py-8 text-zinc-500 text-xs italic space-y-3">
        <p>No hay otros dispositivos vinculados aún.</p>
        <button 
          type="button"
          class="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm inline-flex flex-row items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          @click="showConnectModal = true"
        >
          <Link class="w-4 h-4 shrink-0" />
          <span>Vincular Segundo Celular Ahora</span>
        </button>
      </div>

      <div 
        v-for="u in meshStore.users" 
        :key="u.id"
        class="p-3 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between gap-2.5 shadow-sm"
      >
        <!-- User Info Column -->
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-emerald-400 shrink-0 text-xs sm:text-sm">
            {{ u.name.charAt(0).toUpperCase() }}
          </div>
          
          <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-xs sm:text-sm font-bold text-zinc-100 truncate">{{ u.name }}</span>
              <AppBadge v-if="u.id === authStore.userId" variant="transit" size="xs">
                (Tú)
              </AppBadge>
            </div>
            
            <div class="flex items-center gap-2 flex-wrap">
              <AppBadge :variant="getBadgeVariant(u.status)" size="xs">
                {{ u.status || 'A salvo' }}
              </AppBadge>
              
              <span class="text-[10px] sm:text-[11px] font-medium text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                <Clock class="w-3 h-3 text-emerald-400 shrink-0" />
                {{ formatTime(u.updatedAt || u.lastSeen) }}
              </span>
            </div>

            <p v-if="u.notes" class="text-[11px] text-zinc-300 italic truncate">
              "{{ u.notes }}"
            </p>
          </div>
        </div>

        <!-- Ping Action Button -->
        <div v-if="u.id !== authStore.userId" class="shrink-0 flex items-center pl-1">
          <button 
            type="button"
            class="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex flex-row items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
            title="Enviar Ping de Estado"
            @click="sendPingToUser(u)"
          >
            <Radio class="w-3.5 h-3.5 shrink-0" />
            <span>Ping</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Connect / Link Device Modal -->
    <AppModal
      v-model="showConnectModal"
      title="Vincular Dispositivo P2P"
      subtitle="Conexión directa entre celulares sin servidores centrales"
      max-width="md"
    >
      <template #header-icon>
        <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Link class="w-5 h-5" />
        </div>
      </template>

      <div class="space-y-4 text-xs">
        <div class="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
          <span class="font-bold text-emerald-400 block text-xs">Tu ID de este dispositivo:</span>
          <div class="flex items-center justify-between gap-2 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
            <code class="text-zinc-100 font-mono text-xs select-all break-all">{{ authStore.userId }}</code>
            <button 
              type="button"
              class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0 cursor-pointer whitespace-nowrap"
              @click="copyOwnId"
            >
              {{ copiedId ? '¡Copiado!' : 'Copiar' }}
            </button>
          </div>
          <p class="text-[11px] text-zinc-400 mt-1">Copia este ID y pégalo en el segundo celular para conectarlos directamente.</p>
        </div>

        <AppInput
          v-model="targetInputId"
          label="Ingresa el ID del otro celular"
          placeholder="Ej. salvate-carlos_perez-k4m8p1"
          required
        />
      </div>

      <template #footer>
        <button 
          type="button" 
          class="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          @click="showConnectModal = false"
        >
          Cancelar
        </button>
        <button 
          type="button" 
          :disabled="!targetInputId.trim()" 
          class="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
          @click="connectTargetDevice"
        >
          Conectar Dispositivos
        </button>
      </template>
    </AppModal>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMeshStore } from '../stores/meshStore';
import { useAuthStore } from '../stores/authStore';
import { useDialogStore } from '../stores/dialogStore';
import AppBadge from './ui/AppBadge.vue';
import AppModal from './ui/AppModal.vue';
import AppInput from './ui/AppInput.vue';
import { Users, Clock, Radio, Link, RefreshCw } from 'lucide-vue-next';

const meshStore = useMeshStore();
const authStore = useAuthStore();
const dialogStore = useDialogStore();

const showConnectModal = ref(false);
const targetInputId = ref('');
const copiedId = ref(false);

onMounted(() => {
  meshStore.reloadFromDB();
});

const copyOwnId = async () => {
  try {
    await navigator.clipboard.writeText(authStore.userId);
    copiedId.value = true;
    setTimeout(() => copiedId.value = false, 2000);
  } catch (e) {}
};

const connectTargetDevice = async () => {
  if (!targetInputId.value.trim()) return;
  const targetId = targetInputId.value.trim();
  await meshStore.linkDeviceBidirectional(targetId, authStore.user);
  targetInputId.value = '';
  showConnectModal.value = false;
};

const confirmCleanupInactives = () => {
  dialogStore.confirm({
    title: '¿Limpiar contactos inactivos?',
    message: 'Esta acción removerá del directorio los contactos de sesiones previas que no hayan enviado actualizaciones recientes.',
    confirmText: 'Limpiar Inactivos',
    cancelText: 'Cancelar',
    variant: 'warning',
    onConfirm: async () => {
      await meshStore.cleanupGhostUsers(authStore.userId);
    }
  });
};

const getBadgeVariant = (status) => {
  if (status === 'A salvo') return 'safe';
  if (status === 'En traslado') return 'transit';
  return 'danger';
};

const formatTime = (isoString) => {
  if (!isoString) return 'Hace un momento';
  const date = new Date(isoString);
  const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (isNaN(diffSecs) || diffSecs < 10) return 'Hace un momento';
  if (diffSecs < 60) return `Hace ${diffSecs}s`;
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `Hace ${diffMins}m`;
  
  const hours = Math.floor(diffMins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const sendPingToUser = (user) => {
  meshStore.sendStatusPingToMesh(authStore.user);
};
</script>

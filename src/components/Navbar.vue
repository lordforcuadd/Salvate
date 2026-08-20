<template>
  <header class="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-zinc-800 px-3 sm:px-6 py-2.5 transition-colors">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-2">
      
      <!-- Brand & Tactical Title -->
      <div class="flex items-center gap-2 sm:gap-3 min-w-0">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-base sm:text-lg shadow-inner shrink-0">
          <ShieldAlert class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <h1 class="text-sm sm:text-lg font-black tracking-tight text-zinc-100 truncate">Sálvate</h1>
          <p class="text-[10px] sm:text-[11px] text-zinc-400 hidden sm:block truncate font-medium">SOS & Red Offline</p>
        </div>
      </div>

      <!-- Actions & Status Indicators (Responsive Row) -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        <!-- Highly Visible Compact Internet / Signal Status Pill -->
        <div 
          :class="[
            'h-8 sm:h-9 px-2 sm:px-3 rounded-xl border flex items-center gap-1.5 transition-all shadow-sm shrink-0 font-black text-[11px] sm:text-xs select-none',
            authStore.isOnline
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
          ]"
          :title="authStore.isOnline ? 'Conexión a Internet activa (WiFi / Datos Móviles)' : 'Sin Internet • Operando en Red Malla P2P Offline'"
        >
          <!-- Pulsing Live Indicator Dot -->
          <span 
            :class="[
              'w-2 h-2 rounded-full shrink-0 animate-pulse',
              authStore.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
            ]"
          ></span>

          <component :is="authStore.isOnline ? Wifi : WifiOff" class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate">{{ authStore.isOnline ? 'Online' : 'Sin Internet' }}</span>
        </div>

        <!-- Notification Toggle Button (Pure Activation / Deactivation Switch) -->
        <button
          type="button"
          :class="[
            'h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95 relative',
            notificationStore.soundEnabled && notificationStore.hasPermission
              ? 'bg-zinc-900 border-zinc-800 text-emerald-400 hover:bg-zinc-800'
              : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
          ]"
          :title="notificationStore.soundEnabled && notificationStore.hasPermission ? 'Notificaciones activadas (Clic para desactivar)' : 'Notificaciones desactivadas (Clic para activar)'"
          @click="toggleNotifications"
        >
          <component :is="notificationStore.soundEnabled && notificationStore.hasPermission ? Bell : BellOff" class="w-4 h-4 shrink-0" />
          <span 
            v-if="notificationStore.hasUnread" 
            class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center border-2 border-black animate-pulse"
          >
            {{ notificationStore.totalUnreadCount }}
          </span>
        </button>

        <!-- Help Guide Button (Emerald Green Primary) -->
        <button
          type="button"
          class="h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-md shadow-emerald-500/15 cursor-pointer active:scale-95"
          title="Guía de uso rápido y emergencias"
          @click="showHelpModal = true"
        >
          <HelpCircle class="w-4 h-4 shrink-0" />
          <span class="text-[11px] sm:text-xs">Guía</span>
        </button>

        <!-- Reset Data Button -->
        <button
          type="button"
          class="h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer active:scale-95"
          title="Reiniciar datos locales para probar desde cero"
          @click="confirmResetApp"
        >
          <RotateCcw class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span class="hidden lg:inline text-[11px]">Reiniciar</span>
        </button>

        <!-- User Profile Pill -->
        <div v-if="authStore.isAuthenticated" class="flex items-center shrink-0">
          <button 
            type="button"
            class="h-8 sm:h-9 px-2 sm:px-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center gap-1.5 text-zinc-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
            title="Ver mi perfil"
            @click="$emit('open-profile')"
          >
            <User class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span class="max-w-[60px] sm:max-w-[100px] truncate text-[11px] sm:text-xs font-bold">{{ authStore.userName }}</span>
          </button>
        </div>

      </div>

    </div>

    <!-- Guía de Uso & Resiliencia Modal (Responsive Centered) -->
    <AppModal
      v-model="showHelpModal"
      title="Guía de Emergencias"
      subtitle="Protocolos esenciales sin internet"
      max-width="lg"
    >
      <template #header-icon>
        <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <HelpCircle class="w-5 h-5" />
        </div>
      </template>

      <div class="space-y-3 text-xs text-zinc-300 py-1">
        
        <!-- Step 1 Card -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 flex items-start gap-3 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-black flex items-center justify-center shrink-0 text-xs border border-emerald-500/30">
            01
          </div>
          <div class="space-y-0.5 min-w-0">
            <h4 class="font-black text-emerald-400 text-xs sm:text-sm">Reporta tu Estado en 1 Toque</h4>
            <p class="text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
              Toca <strong>"A salvo"</strong>, <strong>"En traslado"</strong> o <strong>"Requiere ayuda"</strong>. Tu reporte se almacena localmente y se transmite de inmediato a tus contactos vía red de malla P2P.
            </p>
          </div>
        </div>

        <!-- Step 2 Card -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-teal-500/30 flex items-start gap-3 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 font-mono font-black flex items-center justify-center shrink-0 text-xs border border-teal-500/30">
            02
          </div>
          <div class="space-y-0.5 min-w-0">
            <h4 class="font-black text-teal-400 text-xs sm:text-sm">Mensajería y Notas de Voz Sin Internet</h4>
            <p class="text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
              Comunícate por texto o audio. Los mensajes saltan de dispositivo en dispositivo mediante WebRTC directo o retransmisión local sin saldo ni datos móviles.
            </p>
          </div>
        </div>

        <!-- Step 3 Card -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/30 flex items-start gap-3 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-mono font-black flex items-center justify-center shrink-0 text-xs border border-amber-500/30">
            03
          </div>
          <div class="space-y-0.5 min-w-0">
            <h4 class="font-black text-amber-400 text-xs sm:text-sm">Monitoreo Sísmico Oficial IGP / CENSIS</h4>
            <p class="text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
              Visualiza sismos en tiempo real con departamento, magnitud, profundidad, fecha oficial exacta y cálculo de distancia en kilómetros desde tu ubicación GPS.
            </p>
          </div>
        </div>

        <!-- Step 4 Card -->
        <div class="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/30 flex items-start gap-3 shadow-sm">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-black flex items-center justify-center shrink-0 text-xs border border-emerald-500/30">
            04
          </div>
          <div class="space-y-0.5 min-w-0">
            <h4 class="font-black text-emerald-400 text-xs sm:text-sm">Bóveda Médica & QR de Rescate Offline</h4>
            <p class="text-zinc-300 text-[11px] sm:text-xs leading-relaxed">
              Accede a grupos sanguíneos, alergias y condiciones médicas de tu familia. Los socorristas pueden escanear el código QR directamente de tu pantalla sin conexión a internet.
            </p>
          </div>
        </div>

      </div>

      <template #footer>
        <AppButton variant="primary" full-width @click="showHelpModal = false">
          Entendido, Volver a la App
        </AppButton>
      </template>
    </AppModal>

  </header>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useDialogStore } from '../stores/dialogStore';
import { useNotificationStore } from '../stores/notificationStore';
import AppBadge from './ui/AppBadge.vue';
import AppButton from './ui/AppButton.vue';
import AppModal from './ui/AppModal.vue';
import { ShieldAlert, User, HelpCircle, RotateCcw, Wifi, WifiOff, Bell, BellOff } from 'lucide-vue-next';

defineEmits(['open-profile']);
const authStore = useAuthStore();
const dialogStore = useDialogStore();
const notificationStore = useNotificationStore();

const showHelpModal = ref(false);

const toggleNotifications = async () => {
  if (!notificationStore.hasPermission) {
    await notificationStore.requestPermission();
  } else {
    notificationStore.soundEnabled = !notificationStore.soundEnabled;
    notificationStore.vibrationEnabled = notificationStore.soundEnabled;
  }
};

const confirmResetApp = () => {
  dialogStore.confirm({
    title: '¿Reiniciar y probar desde cero?',
    message: 'Esta acción borrará los registros locales temporales en este dispositivo para que puedas probar el flujo de ingreso nuevamente.',
    confirmText: 'Sí, Reiniciar Todo',
    cancelText: 'Cancelar',
    variant: 'danger',
    onConfirm: async () => {
      await authStore.resetAllData();
    }
  });
};
</script>

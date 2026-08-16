<template>
  <div class="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950">
    
    <!-- Global Confirm & Alert Dialog -->
    <AppConfirmDialog />

    <!-- Top Navbar -->
    <Navbar @open-profile="openTab('directory')" />

    <!-- STACKABLE NOTIFICATION TOAST FEED (Top-Right Sticky) -->
    <div class="fixed top-14 right-3 sm:right-6 z-[9999] max-w-sm w-full space-y-2 pointer-events-none p-2">
      <div 
        v-for="n in meshStore.notifications" 
        :key="n.id"
        :class="[
          'p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl pointer-events-auto transition-all flex items-start justify-between gap-3 animate-slide-in',
          n.colorClass
        ]"
      >
        <div class="flex items-start gap-2.5">
          <div class="w-7 h-7 rounded-xl bg-zinc-900/80 border border-zinc-700/60 flex items-center justify-center shrink-0">
            <Radio class="w-3.5 h-3.5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h5 class="text-xs font-black tracking-tight">{{ n.title }}</h5>
              <span class="text-[10px] opacity-75 font-mono">{{ n.timestamp }}</span>
            </div>
            <p class="text-xs mt-0.5 leading-snug">{{ n.message }}</p>
          </div>
        </div>

        <button 
          type="button"
          class="text-xs opacity-60 hover:opacity-100 font-black shrink-0 p-1 cursor-pointer"
          @click="meshStore.dismissNotification(n.id)"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Name-Only Frictionless Auth Modal if not authenticated -->
    <AuthModal v-if="!authStore.isAuthenticated" />

    <!-- Main Content Hub -->
    <main v-else class="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 pb-28 sm:pb-12 space-y-5">
      
      <!-- Calming Emergency Status Card (Black & Emerald) -->
      <div class="p-4 sm:p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
            <HeartHandshake class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
              Hola, {{ authStore.userName }}. Mantén la calma, Sálvate está activo.
            </h2>
            <p class="text-xs text-zinc-400 mt-0.5">
              Esta aplicación opera 100% sin conexión. Puedes reportar tu estado en un solo toque.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <AppBadge :variant="getStatusBadgeVariant(authStore.userStatus)" size="md">
            Tu Estado: {{ authStore.userStatus }}
          </AppBadge>
        </div>
      </div>

      <!-- Quick Navigation Tabs Bar (Visible on Tablet & Desktop) -->
      <div class="hidden sm:flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800 scrollbar-none">
        <button
          v-for="tab in allTabs"
          :key="tab.id"
          type="button"
          :class="[
            'px-4 py-2.5 rounded-2xl font-black text-xs flex flex-row items-center gap-2 whitespace-nowrap transition-all touch-btn shrink-0 cursor-pointer',
            activeTab === tab.id
              ? tab.activeClass
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          ]"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" class="w-4 h-4 shrink-0" />
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- VIEW 1: All-in-One Emergency Dashboard -->
      <div v-if="activeTab === 'dashboard'" class="space-y-6">
        
        <!-- Top Section: Status Ping & Rescue Tools -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div class="lg:col-span-7 xl:col-span-8">
            <StatusPing />
          </div>
          <div class="lg:col-span-5 xl:col-span-4">
            <RescueTools />
          </div>
        </div>

        <!-- Seismic Radar & Map -->
        <SeismicRadar />

        <!-- Hazard Map -->
        <HazardMap />

        <!-- Communication & Directory Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
          <AsyncBroadcast />
          <UserDirectory />
        </div>

        <!-- Medical Vault -->
        <MedicalVault />

      </div>

      <!-- VIEW 2: Single-Focus Views based on activeTab -->
      <div v-else class="space-y-6">
        
        <!-- Tab: Status SOS -->
        <div v-if="activeTab === 'status'">
          <StatusPing />
        </div>

        <!-- Tab: Seismic Radar -->
        <div v-else-if="activeTab === 'seismic'">
          <SeismicRadar />
        </div>

        <!-- Tab: Hazard Map -->
        <div v-else-if="activeTab === 'hazards'">
          <HazardMap />
        </div>

        <!-- Tab: P2P Broadcast Chat -->
        <div v-else-if="activeTab === 'broadcast'">
          <AsyncBroadcast />
        </div>

        <!-- Tab: Medical Vault -->
        <div v-else-if="activeTab === 'medical'">
          <MedicalVault />
        </div>

        <!-- Tab: User Directory & Linked Devices -->
        <div v-else-if="activeTab === 'directory'">
          <UserDirectory />
        </div>

        <!-- Tab: Rescue Tools & Sirens -->
        <div v-else-if="activeTab === 'tools'">
          <RescueTools />
        </div>

      </div>

    </main>

    <!-- Mobile-First Ergonomic Bottom Navigation Bar (Deep Black & Emerald Glow) -->
    <nav 
      v-if="authStore.isAuthenticated" 
      class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 px-3 py-2 flex items-center justify-around shadow-2xl"
    >
      <button 
        v-for="tab in mobileMainTabs" 
        :key="tab.id"
        type="button"
        :class="[
          'flex flex-col items-center justify-center p-2 rounded-2xl transition-all cursor-pointer active:scale-95 min-w-[58px]',
          activeTab === tab.id ? 'text-emerald-400 font-black scale-105' : 'text-zinc-400 font-semibold'
        ]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" class="w-5 h-5" />
        <span class="text-[10px] mt-1">{{ tab.shortLabel }}</span>
      </button>

      <!-- "Más" Menu Sheet Launcher -->
      <button 
        type="button"
        :class="[
          'flex flex-col items-center justify-center p-2 rounded-2xl transition-all cursor-pointer active:scale-95 min-w-[58px]',
          isMoreMenuOpen ? 'text-emerald-400 font-black' : 'text-zinc-400 font-semibold'
        ]"
        @click="isMoreMenuOpen = true"
      >
        <Menu class="w-5 h-5" />
        <span class="text-[10px] mt-1">Más</span>
      </button>
    </nav>

    <!-- Mobile "Más / Herramientas" Bottom Sheet Drawer (Black & Emerald) -->
    <AppModal
      v-model="isMoreMenuOpen"
      title="Todos los Módulos"
      subtitle="Acceso directo a todos los servicios de emergencia"
      max-width="md"
    >
      <div class="space-y-2.5 py-1">
        <button
          v-for="item in mobileMoreTabs"
          :key="item.id"
          type="button"
          class="w-full p-3.5 rounded-2xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between gap-3 text-left transition-all cursor-pointer active:scale-[0.98] shadow-sm"
          @click="selectMoreTab(item.id)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div :class="['w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner', item.iconClass]">
              <component :is="item.icon" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h4 class="text-xs sm:text-sm font-black text-zinc-100 leading-snug">{{ item.label }}</h4>
              <p class="text-[11px] text-zinc-400 mt-0.5 truncate">{{ item.desc }}</p>
            </div>
          </div>

          <div class="w-8 h-8 rounded-xl bg-zinc-800/80 flex items-center justify-center shrink-0 text-zinc-400">
            <ChevronRight class="w-4 h-4 text-zinc-300" />
          </div>
        </button>
      </div>
    </AppModal>

    <!-- Global Footer -->
    <footer class="bg-black border-t border-zinc-900 py-4 px-6 text-center text-xs text-zinc-500">
      <p>Sálvate • Red de Resiliencia y Emergencias • Operativo 100% Sin Conexión</p>
    </footer>

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from './stores/authStore';
import { useMeshStore } from './stores/meshStore';

import Navbar from './components/Navbar.vue';
import AuthModal from './components/AuthModal.vue';
import StatusPing from './components/StatusPing.vue';
import UserDirectory from './components/UserDirectory.vue';
import AsyncBroadcast from './components/AsyncBroadcast.vue';
import SeismicRadar from './components/SeismicRadar.vue';
import MedicalVault from './components/MedicalVault.vue';
import RescueTools from './components/RescueTools.vue';
import HazardMap from './components/HazardMap.vue';

import AppBadge from './components/ui/AppBadge.vue';
import AppModal from './components/ui/AppModal.vue';
import AppConfirmDialog from './components/ui/AppConfirmDialog.vue';

import { 
  LayoutDashboard, 
  ShieldCheck, 
  Activity, 
  MessageSquare, 
  HeartPulse, 
  AlertTriangle, 
  Users, 
  HeartHandshake, 
  Zap, 
  Menu,
  Radio,
  ChevronRight
} from 'lucide-vue-next';

const authStore = useAuthStore();
const meshStore = useMeshStore();

const activeTab = ref('dashboard');
const isMoreMenuOpen = ref(false);

const allTabs = [
  { id: 'dashboard', label: 'Inicio', shortLabel: 'Inicio', icon: LayoutDashboard, activeClass: 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20' },
  { id: 'status', label: 'Mi Estado (SOS)', shortLabel: 'Estado', icon: ShieldCheck, activeClass: 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20' },
  { id: 'seismic', label: 'Sismos IGP', shortLabel: 'Sismos', icon: Activity, activeClass: 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20' },
  { id: 'broadcast', label: 'Mensajes P2P', shortLabel: 'Mensajes', icon: MessageSquare, activeClass: 'bg-emerald-600 text-white shadow-md' },
  { id: 'medical', label: 'Ficha Médica', shortLabel: 'Salud', icon: HeartPulse, activeClass: 'bg-teal-600 text-white shadow-md' },
  { id: 'hazards', label: 'Mapa Peligros', shortLabel: 'Peligros', icon: AlertTriangle, activeClass: 'bg-rose-600 text-white shadow-md' },
  { id: 'directory', label: 'Directorio', shortLabel: 'Red', icon: Users, activeClass: 'bg-zinc-800 text-emerald-400 border border-emerald-500/40 shadow-md' },
  { id: 'tools', label: 'Herramientas SOS', shortLabel: 'Rescate', icon: Zap, activeClass: 'bg-amber-500 text-zinc-950 shadow-md' },
];

const mobileMainTabs = [
  { id: 'dashboard', shortLabel: 'Inicio', icon: LayoutDashboard },
  { id: 'status', shortLabel: 'Mi Estado', icon: ShieldCheck },
  { id: 'seismic', shortLabel: 'Sismos', icon: Activity },
  { id: 'broadcast', shortLabel: 'Mensajes', icon: MessageSquare },
];

const mobileMoreTabs = [
  { 
    id: 'medical', 
    label: 'Ficha Médica & QR', 
    desc: 'Grupos sanguíneos, alergias y código QR offline',
    icon: HeartPulse, 
    iconClass: 'bg-teal-500/15 text-teal-400 border-teal-500/30' 
  },
  { 
    id: 'hazards', 
    label: 'Mapa de Peligros', 
    desc: 'Reportes de vías bloqueadas, derrumbes y gas',
    icon: AlertTriangle, 
    iconClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
  },
  { 
    id: 'directory', 
    label: 'Directorio de Red P2P', 
    desc: 'Dispositivos vinculados y alcance de señal',
    icon: Users, 
    iconClass: 'bg-zinc-800 text-emerald-400 border-emerald-500/30' 
  },
  { 
    id: 'tools', 
    label: 'Herramientas SOS de Rescate', 
    desc: 'Silbato 2500Hz, sirena acústica y linterna Morse',
    icon: Zap, 
    iconClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
  },
];

const openTab = (tabId) => {
  activeTab.value = tabId;
};

const selectMoreTab = (tabId) => {
  activeTab.value = tabId;
  isMoreMenuOpen.value = false;
};

const getStatusBadgeVariant = (status) => {
  if (status === 'A salvo') return 'safe';
  if (status === 'En traslado') return 'transit';
  return 'danger';
};

onMounted(() => {
  authStore.initAuth();
  if (authStore.isAuthenticated) {
    meshStore.initMesh(authStore.user);
  }
});

watch(() => authStore.user, (newUser) => {
  if (newUser) {
    meshStore.initMesh(newUser);
  }
}, { deep: true });
</script>

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
          <p class="text-[11px] sm:text-xs text-zinc-400 truncate">Red de ayuda mutua & auxilio P2P</p>
        </div>
      </div>

      <!-- Action Buttons Row -->
      <div class="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end flex-wrap">
        <button 
          type="button"
          class="h-9 px-2.5 sm:px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold flex flex-row items-center justify-center gap-1.5 transition-all border border-zinc-800 cursor-pointer active:scale-95 shrink-0"
          title="Limpiar contactos inactivos (>3 min)"
          @click="confirmCleanupInactives"
        >
          <RefreshCw class="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span class="hidden xs:inline">Limpiar Inactivos</span>
        </button>

        <button 
          type="button"
          class="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex flex-row items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          @click="openConnectModal"
        >
          <QrCode class="w-3.5 h-3.5 shrink-0" />
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
          @click="openConnectModal"
        >
          <QrCode class="w-4 h-4 shrink-0" />
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
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-xs sm:text-sm font-bold text-zinc-100 truncate min-w-0 flex-1">{{ u.name }}</span>
              <AppBadge v-if="u.id === authStore.userId" variant="transit" size="xs" class="shrink-0">
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

    <!-- Enhanced Linking & Discovery Modal (Black & Emerald) -->
    <AppModal
      v-model="showConnectModal"
      title="Vincular Dispositivos P2P"
      subtitle="Conexión directa entre celulares sin servidores centrales"
      max-width="lg"
    >
      <template #header-icon>
        <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <QrCode class="w-5 h-5" />
        </div>
      </template>

      <div class="space-y-4">
        
        <!-- Navigation Tabs for Connection Modes -->
        <div class="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs">
          <button
            type="button"
            :class="[
              'py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer active:scale-95 truncate',
              activePairTab === 'qr_offline' ? 'bg-emerald-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
            ]"
            @click="activePairTab = 'qr_offline'"
          >
            Offline por QR
          </button>

          <button
            type="button"
            :class="[
              'py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer active:scale-95 truncate',
              activePairTab === 'direct_id' ? 'bg-emerald-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
            ]"
            @click="activePairTab = 'direct_id'"
          >
            Por ID Directo
          </button>

          <button
            type="button"
            :class="[
              'py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer active:scale-95 truncate',
              activePairTab === 'local_lan' ? 'bg-emerald-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-zinc-200'
            ]"
            @click="activePairTab = 'local_lan'"
          >
            Servidor Local
          </button>
        </div>

        <!-- TAB 1: 100% OFFLINE QR WEB RTC PAIRING (ZERO SERVERS / ZERO INTERNET) -->
        <div v-if="activePairTab === 'qr_offline'" class="space-y-3.5">
          
          <div class="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-200">
            <WifiOff class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div class="space-y-1 min-w-0">
              <p class="font-black text-emerald-300">Emparejamiento 100% Sin Internet ni Servidores</p>
              <p class="text-[11px] opacity-90 leading-relaxed">
                Escanea los códigos QR entre ambos celulares conectados al mismo WiFi o hotspot. El canal WebRTC se enlazará al instante de forma directa.
              </p>
            </div>
          </div>

          <!-- Step Selector -->
          <div class="flex items-center justify-between gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] font-bold">
            <button
              type="button"
              :class="['min-w-0 flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer truncate', qrStep === 'offer' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400']"
              @click="prepareOfferStep"
            >
              1. Celular A (Generar)
            </button>
            <button
              type="button"
              :class="['min-w-0 flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer truncate', qrStep === 'answer' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400']"
              @click="openAnswerStep"
            >
              2. Celular B (Responder)
            </button>
            <button
              type="button"
              :class="['min-w-0 flex-1 py-1.5 rounded-lg transition-all text-center cursor-pointer truncate', qrStep === 'confirm' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400']"
              @click="openConfirmStep"
            >
              3. Celular A (Completar)
            </button>
          </div>

          <!-- STEP 1: CELULAR A GENERATES OFFER -->
          <div v-if="qrStep === 'offer'" class="space-y-3 p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
            <div class="text-center space-y-1">
              <h4 class="font-black text-zinc-100 text-xs sm:text-sm">Paso 1: Muestra este código QR al Celular B</h4>
              <p class="text-[11px] text-zinc-400">Pide al otro celular que seleccione la pestaña "2. Celular B (Responder)" y apunte su cámara.</p>
            </div>

            <!-- Standard ISO/IEC 18004 QR SVG Canvas -->
            <div v-if="generatedOfferToken" class="flex flex-col items-center justify-center p-3 bg-white rounded-2xl max-w-[240px] mx-auto shadow-xl">
              <div v-html="offerQrSvg" class="w-full h-auto"></div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="flex-1 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer active:scale-95"
                @click="copyOfferToken"
              >
                {{ copiedOffer ? '¡Código Copiado!' : 'Copiar Código de Texto' }}
              </button>

              <button
                type="button"
                class="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black transition-all cursor-pointer active:scale-95"
                @click="prepareOfferStep"
              >
                Regenerar
              </button>
            </div>
          </div>

          <!-- STEP 2: CELULAR B ENTERS/SCANS OFFER AND REPLIES -->
          <div v-if="qrStep === 'answer'" class="space-y-3 p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
            <div class="space-y-1">
              <h4 class="font-black text-zinc-100 text-xs sm:text-sm">Paso 2: Escanea el QR del Celular A</h4>
              <p class="text-[11px] text-zinc-400">Apunta tu cámara al código QR que muestra el Celular A para generar tu respuesta.</p>
            </div>

            <!-- In-App Camera Scanner View -->
            <div v-if="showScannerForAnswer" class="space-y-2">
              <QrCameraScanner
                @scanned="handleScannedOffer"
                @close="showScannerForAnswer = false"
              />
            </div>

            <!-- Camera Trigger Button -->
            <div v-else class="space-y-2.5">
              <button
                type="button"
                class="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                @click="showScannerForAnswer = true"
              >
                <Camera class="w-4 h-4" />
                <span>Abrir Escáner de Cámara</span>
              </button>

              <div class="relative flex py-1 items-center">
                <div class="flex-grow border-t border-zinc-800"></div>
                <span class="flex-shrink mx-3 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">o pega el texto</span>
                <div class="flex-grow border-t border-zinc-800"></div>
              </div>

              <textarea
                v-model="inputOfferToken"
                rows="3"
                class="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-[11px] focus:border-emerald-500 focus:outline-none resize-none"
                placeholder='Pega aquí el código del Celular A...'
              ></textarea>

              <button
                type="button"
                :disabled="!inputOfferToken.trim() || isProcessingAnswer"
                class="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-bold text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                @click="generateAnswerFromOffer"
              >
                <CheckCircle2 class="w-4 h-4 text-emerald-400" />
                <span>Procesar y Generar Respuesta QR</span>
              </button>
            </div>

            <!-- Display Generated Answer QR -->
            <div v-if="generatedAnswerToken" class="pt-3 border-t border-zinc-800 space-y-2.5 text-center">
              <div class="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-bold text-xs">
                ¡Respuesta Lista! Muéstrale este QR al Celular A:
              </div>
              <div class="flex flex-col items-center justify-center p-3 bg-white rounded-2xl max-w-[220px] mx-auto shadow-xl">
                <div v-html="answerQrSvg" class="w-full h-auto"></div>
              </div>
              <button
                type="button"
                class="w-full h-8 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer active:scale-95"
                @click="copyAnswerToken"
              >
                {{ copiedAnswer ? '¡Respuesta Copiada!' : 'Copiar Código de Respuesta' }}
              </button>
            </div>
          </div>

          <!-- STEP 3: CELULAR A APPLIES ANSWER -->
          <div v-if="qrStep === 'confirm'" class="space-y-3 p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
            <div class="space-y-1">
              <h4 class="font-black text-zinc-100 text-xs sm:text-sm">Paso 3: Escanea la Respuesta del Celular B</h4>
              <p class="text-[11px] text-zinc-400">Apunta tu cámara al código QR de respuesta que muestra el Celular B para completar el enlace.</p>
            </div>

            <!-- In-App Camera Scanner View -->
            <div v-if="showScannerForConfirm" class="space-y-2">
              <QrCameraScanner
                @scanned="handleScannedAnswer"
                @close="showScannerForConfirm = false"
              />
            </div>

            <!-- Camera Trigger Button & Textarea -->
            <div v-else class="space-y-2.5">
              <button
                type="button"
                class="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                @click="showScannerForConfirm = true"
              >
                <Camera class="w-4 h-4" />
                <span>Escanear QR del Celular B con Cámara</span>
              </button>

              <div class="relative flex py-1 items-center">
                <div class="flex-grow border-t border-zinc-800"></div>
                <span class="flex-shrink mx-3 text-[10px] text-zinc-500 uppercase font-bold tracking-wider">o pega el texto</span>
                <div class="flex-grow border-t border-zinc-800"></div>
              </div>

              <textarea
                v-model="inputAnswerToken"
                rows="3"
                class="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono text-[11px] focus:border-emerald-500 focus:outline-none resize-none"
                placeholder='Pega aquí el código de respuesta del Celular B...'
              ></textarea>

              <button
                type="button"
                :disabled="!inputAnswerToken.trim() || isFinalizing"
                class="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                @click="finalizeOfflinePairing"
              >
                <Zap class="w-4 h-4" />
                <span>Completar y Activar Enlace P2P</span>
              </button>
            </div>
          </div>

        </div>

        <!-- TAB 2: DIRECT ID PAIRING (CLOUD / LOCAL BROKER) -->
        <div v-if="activePairTab === 'direct_id'" class="space-y-4 text-xs">
          <div class="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <span class="font-bold text-emerald-400 block text-xs">Tu ID en este dispositivo:</span>
            <div class="flex items-center justify-between gap-2 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
              <code class="text-zinc-100 font-mono text-xs select-all break-all">{{ authStore.userId }}</code>
              <button 
                type="button"
                class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold shrink-0 cursor-pointer active:scale-95 whitespace-nowrap"
                @click="copyOwnId"
              >
                {{ copiedId ? '¡Copiado!' : 'Copiar' }}
              </button>
            </div>
            <p class="text-[11px] text-zinc-400 mt-1">Ingresa este ID en el segundo celular para vincularlos automáticamente.</p>
          </div>

          <AppInput
            v-model="targetInputId"
            label="Ingresa el ID del otro celular"
            placeholder="Ej. salvate-carlos_perez-k4m8p1"
            required
          />

          <button 
            type="button" 
            :disabled="!targetInputId.trim()" 
            class="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            @click="connectTargetDevice"
          >
            Conectar Dispositivos por ID
          </button>
        </div>

        <!-- TAB 3: LOCAL LAN SIGNALING SERVER (COMMUNITY DISASTER SHELTER KIT) -->
        <div v-if="activePairTab === 'local_lan'" class="space-y-3.5 text-xs">
          <div class="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-zinc-300 text-xs">
            <div class="flex items-center gap-2 text-amber-400 font-bold">
              <Radio class="w-4 h-4 shrink-0" />
              <span>Modo Albergue / Servidor Local Comunitario</span>
            </div>
            <p class="text-[11px] text-zinc-400 leading-relaxed">
              Si tu albergue o centro de acopio cuenta con un router o Raspberry Pi ejecutando <code>peerjs-server</code> local, ingresa la IP aquí para vincular automáticamente todos los celulares de la red local sin internet.
            </p>
          </div>

          <div class="space-y-3 p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800">
            <div class="flex items-center justify-between">
              <span class="font-bold text-zinc-200">Usar Servidor LAN Local:</span>
              <input 
                type="checkbox" 
                v-model="localServerForm.isCustom"
                class="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            <div v-if="localServerForm.isCustom" class="space-y-2.5 pt-2 border-t border-zinc-800">
              <AppInput
                v-model="localServerForm.host"
                label="IP o Host del Servidor Local"
                placeholder="Ej. 192.168.1.100 o 192.168.9.100"
              />

              <div class="grid grid-cols-2 gap-2">
                <AppInput
                  v-model="localServerForm.port"
                  label="Puerto"
                  placeholder="9000"
                />
                <AppInput
                  v-model="localServerForm.path"
                  label="Ruta (Path)"
                  placeholder="/"
                />
              </div>

              <div class="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="secure-check"
                  v-model="localServerForm.secure"
                  class="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
                <label for="secure-check" class="text-xs text-zinc-300 cursor-pointer font-medium">Conexión HTTPS/SSL segura</label>
              </div>
            </div>

            <button
              type="button"
              class="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs transition-all cursor-pointer active:scale-95"
              @click="saveLocalServerSettings"
            >
              Guardar y Reconectar
            </button>
          </div>
        </div>

      </div>

      <template #footer>
        <button 
          type="button" 
          class="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
          @click="showConnectModal = false"
        >
          Cerrar
        </button>
      </template>
    </AppModal>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMeshStore } from '../stores/meshStore';
import { useAuthStore } from '../stores/authStore';
import { useDialogStore } from '../stores/dialogStore';
import AppBadge from './ui/AppBadge.vue';
import AppModal from './ui/AppModal.vue';
import AppInput from './ui/AppInput.vue';
import QrCameraScanner from './ui/QrCameraScanner.vue';
import { generateQRCodeSVG } from '../utils/qrcode';
import { 
  Users, 
  Clock, 
  Radio, 
  RefreshCw, 
  QrCode, 
  WifiOff, 
  CheckCircle2, 
  Zap,
  Camera
} from 'lucide-vue-next';

const meshStore = useMeshStore();
const authStore = useAuthStore();
const dialogStore = useDialogStore();

const showConnectModal = ref(false);
const activePairTab = ref('qr_offline'); // 'qr_offline' | 'direct_id' | 'local_lan'

// QR Offline State
const qrStep = ref('offer'); // 'offer' | 'answer' | 'confirm'
const generatedOfferToken = ref('');
const inputOfferToken = ref('');
const generatedAnswerToken = ref('');
const inputAnswerToken = ref('');
const isProcessingAnswer = ref(false);
const isFinalizing = ref(false);
const copiedOffer = ref(false);
const copiedAnswer = ref(false);

const showScannerForAnswer = ref(false);
const showScannerForConfirm = ref(false);

// Direct ID State
const targetInputId = ref('');
const copiedId = ref(false);

// Local Server State
const localServerForm = ref({
  isCustom: meshStore.signalingServer?.isCustom || false,
  host: meshStore.signalingServer?.host || '192.168.1.100',
  port: meshStore.signalingServer?.port || 9000,
  path: meshStore.signalingServer?.path || '/',
  secure: meshStore.signalingServer?.secure || false
});

const offerQrSvg = computed(() => {
  if (!generatedOfferToken.value) return '';
  return generateQRCodeSVG(generatedOfferToken.value, 220);
});

const answerQrSvg = computed(() => {
  if (!generatedAnswerToken.value) return '';
  return generateQRCodeSVG(generatedAnswerToken.value, 200);
});

onMounted(() => {
  meshStore.reloadFromDB();
});

const openConnectModal = () => {
  showConnectModal.value = true;
  if (activePairTab.value === 'qr_offline') {
    prepareOfferStep();
  }
};

const openAnswerStep = () => {
  qrStep.value = 'answer';
  showScannerForAnswer.value = true;
};

const openConfirmStep = () => {
  qrStep.value = 'confirm';
  showScannerForConfirm.value = true;
};

const prepareOfferStep = async () => {
  qrStep.value = 'offer';
  showScannerForAnswer.value = false;
  showScannerForConfirm.value = false;
  try {
    if (authStore.user) {
      generatedOfferToken.value = await meshStore.createOfflineManualOffer(authStore.user);
    }
  } catch (e) {
    console.error('Error preparing offer:', e);
  }
};

const copyOfferToken = async () => {
  if (!generatedOfferToken.value) return;
  try {
    await navigator.clipboard.writeText(generatedOfferToken.value);
    copiedOffer.value = true;
    setTimeout(() => copiedOffer.value = false, 2000);
  } catch (e) {}
};

const handleScannedOffer = async (scannedCode) => {
  showScannerForAnswer.value = false;
  inputOfferToken.value = scannedCode;
  await generateAnswerFromOffer();
};

const generateAnswerFromOffer = async () => {
  if (!inputOfferToken.value.trim() || !authStore.user) return;
  isProcessingAnswer.value = true;
  try {
    generatedAnswerToken.value = await meshStore.createOfflineManualAnswer(inputOfferToken.value.trim(), authStore.user);
    dialogStore.alert({
      title: 'Respuesta Generada',
      message: 'Código de respuesta generado. Muéstraselo al Celular A para completar la vinculación.',
      variant: 'safe'
    });
  } catch (err) {
    dialogStore.alert({
      title: 'Código Inválido',
      message: err.message || 'No se pudo procesar la oferta. Asegúrate de enfocar bien el código QR.',
      variant: 'warning'
    });
  } finally {
    isProcessingAnswer.value = false;
  }
};

const copyAnswerToken = async () => {
  if (!generatedAnswerToken.value) return;
  try {
    await navigator.clipboard.writeText(generatedAnswerToken.value);
    copiedAnswer.value = true;
    setTimeout(() => copiedAnswer.value = false, 2000);
  } catch (e) {}
};

const handleScannedAnswer = async (scannedCode) => {
  showScannerForConfirm.value = false;
  inputAnswerToken.value = scannedCode;
  await finalizeOfflinePairing();
};

const finalizeOfflinePairing = async () => {
  if (!inputAnswerToken.value.trim()) return;
  isFinalizing.value = true;
  try {
    const res = await meshStore.applyOfflineManualAnswer(inputAnswerToken.value.trim());
    dialogStore.alert({
      title: '¡Enlace Offline Establecido!',
      message: `Te has vinculado directamente con "${res.remotePeerName || 'el otro dispositivo'}" sin necesidad de internet.`,
      variant: 'safe'
    });
    showConnectModal.value = false;
    inputAnswerToken.value = '';
    showScannerForConfirm.value = false;
  } catch (err) {
    dialogStore.alert({
      title: 'Error de Vinculación',
      message: err.message || 'No se pudo completar el enlace. Verifica que la respuesta corresponda a tu oferta actual.',
      variant: 'warning'
    });
  } finally {
    isFinalizing.value = false;
  }
};

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

const saveLocalServerSettings = () => {
  meshStore.updateSignalingServer(localServerForm.value, authStore.user);
  dialogStore.alert({
    title: 'Servidor Actualizado',
    message: localServerForm.value.isCustom 
      ? `Conectando al servidor local ${localServerForm.value.host}:${localServerForm.value.port}...`
      : 'Configuración restaurada al servidor predeterminado.',
    variant: 'safe'
  });
};

const confirmCleanupInactives = () => {
  dialogStore.confirm({
    title: '¿Limpiar contactos inactivos?',
    message: 'Esta acción removerá del directorio únicamente los contactos que lleven más de 3 minutos sin enviar señales de vida.',
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

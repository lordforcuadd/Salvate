<template>
  <div class="glass-card p-4 sm:p-6 border border-zinc-800 space-y-4">
    
    <!-- Component Header -->
    <div class="flex flex-col gap-2 pb-3 border-b border-zinc-800">
      <div class="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-base sm:text-lg font-black text-zinc-100">Red de Mensajería & Voz Híbrida</h3>
            <p class="text-xs text-zinc-400">Mensajes de texto y notas de voz con o sin internet</p>
          </div>
        </div>

        <!-- Mode Indicator Pill -->
        <AppBadge 
          :variant="meshStore.isOnlineMode ? 'safe' : 'p2p'" 
          size="sm" 
          :dot="true"
        >
          {{ meshStore.isOnlineMode ? 'Nacional (Internet)' : 'Red P2P Malla (Offline)' }}
        </AppBadge>
      </div>
    </div>

    <!-- Mode Selector & Connected Devices Badge -->
    <div class="flex items-center justify-between gap-2 bg-zinc-900/95 p-1.5 rounded-2xl border border-zinc-800">
      <div class="flex items-center gap-1.5">
        <button 
          type="button"
          :class="[
            'px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer',
            mode === 'text' ? 'bg-emerald-500 text-zinc-950 shadow-md font-black' : 'text-zinc-400 hover:text-zinc-200'
          ]"
          @click="mode = 'text'"
        >
          <Send class="w-3.5 h-3.5" />
          <span>Texto</span>
        </button>

        <button 
          type="button"
          :class="[
            'px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer',
            mode === 'audio' ? 'bg-emerald-500 text-zinc-950 shadow-md font-black' : 'text-zinc-400 hover:text-zinc-200'
          ]"
          @click="mode = 'audio'"
        >
          <Mic class="w-3.5 h-3.5" />
          <span>Nota de Voz</span>
        </button>
      </div>

      <AppBadge variant="p2p" size="xs" custom-class="hidden sm:inline-flex">
        {{ formatConnectedDevicesText(meshStore.peerConnections.length) }}
      </AppBadge>
    </div>

    <!-- Compact Input Form -->
    <div class="p-3 rounded-2xl bg-zinc-900/95 border border-zinc-800">
      
      <!-- Audio Recording Interface (Compact) -->
      <div v-if="mode === 'audio'" class="flex items-center justify-between gap-3 py-1">
        <div v-if="!isRecording" class="flex items-center gap-3 w-full justify-between">
          <span class="text-xs text-zinc-300 font-medium">Graba un audio corto para transmitir en vivo</span>
          <button 
            type="button"
            class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            @click="startRecording"
          >
            <Mic class="w-4 h-4" />
            <span>Grabar Voz</span>
          </button>
        </div>

        <div v-else class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
            <span class="text-xs font-black text-rose-400">Grabando... {{ recordingTime }}s</span>
          </div>
          <button 
            type="button"
            class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            @click="stopRecording"
          >
            <Square class="w-3.5 h-3.5" />
            <span>Enviar Audio</span>
          </button>
        </div>
      </div>

      <!-- Text Input Form -->
      <div v-else class="flex gap-2">
        <input
          v-model="textContent"
          type="text"
          placeholder="Escribe un mensaje de emergencia..."
          class="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-medium"
          @keydown.enter.prevent="sendTextBroadcast"
        />
        
        <button
          type="button"
          :disabled="!textContent.trim()"
          class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
          @click="sendTextBroadcast"
        >
          <Send class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Enviar</span>
        </button>
      </div>

    </div>

    <!-- COMPACT CHAT ROOM FEED -->
    <div class="space-y-2">
      <div class="flex items-center justify-between text-xs font-black text-zinc-400 uppercase tracking-wider px-1">
        <span>Chat en Vivo ({{ meshStore.broadcasts.length }})</span>
        <AppBadge variant="p2p" size="xs">Red Híbrida P2P</AppBadge>
      </div>

      <div class="space-y-2.5 max-h-[320px] overflow-y-auto pr-1 p-3 bg-black/80 rounded-2xl border border-zinc-800">
        <div v-if="meshStore.broadcasts.length === 0" class="text-center py-8 text-zinc-500 text-xs italic">
          No hay mensajes en la sala. Escribe un mensaje o graba una nota de voz de prueba.
        </div>

        <!-- Sleek Message Bubbles -->
        <div 
          v-for="b in meshStore.broadcasts" 
          :key="b.id"
          :class="[
            'flex flex-col max-w-[85%] sm:max-w-[72%] px-3.5 py-2.5 rounded-2xl text-xs space-y-1 shadow-sm transition-all',
            b.senderId === authStore.userId
              ? 'ml-auto bg-emerald-600/90 text-white border border-emerald-500/40 rounded-br-sm'
              : 'mr-auto bg-zinc-900/95 text-zinc-100 border border-zinc-800 rounded-bl-sm'
          ]"
        >
          <!-- Sender Info & Timestamp Header -->
          <div class="flex items-center justify-between gap-3 text-[11px] opacity-80 pb-0.5 font-bold">
            <span>{{ b.senderId === authStore.userId ? 'Tú' : b.senderName }}</span>
            <span class="font-mono text-[10px]">{{ formatExactTime(b.timestamp) }}</span>
          </div>

          <!-- Message Text Content -->
          <p v-if="b.content" class="leading-relaxed text-xs break-words font-normal">
            {{ b.content }}
          </p>

          <!-- Voice Note Audio Player -->
          <div v-if="b.audioUrl" class="pt-1">
            <audio :src="b.audioUrl" controls class="w-full h-8 rounded-lg bg-zinc-900 filter invert-[0.9] opacity-90"></audio>
          </div>

          <!-- Transmission Metadata Footer -->
          <div class="flex items-center justify-between text-[10px] opacity-65 pt-1 font-mono border-t border-white/10">
            <span>{{ b.mode || (b.synced ? 'Internet' : 'P2P') }}</span>
            <span>{{ formatHopCountText(b.hopCount) }}</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMeshStore } from '../stores/meshStore';
import { useAuthStore } from '../stores/authStore';
import { useDialogStore } from '../stores/dialogStore';
import AppBadge from './ui/AppBadge.vue';
import { MessageSquare, Mic, Square, Send } from 'lucide-vue-next';

const meshStore = useMeshStore();
const authStore = useAuthStore();
const dialogStore = useDialogStore();

const mode = ref('text');
const textContent = ref('');

const isRecording = ref(false);
const recordingTime = ref(0);
let mediaRecorder = null;
let audioChunks = [];
let timerInterval = null;

onMounted(() => {
  meshStore.reloadFromDB();
});

const formatConnectedDevicesText = (count) => {
  if (count === 0) return '0 Conectados';
  if (count === 1) return '1 Celular Directo';
  return `${count} Celulares Conectados`;
};

const formatHopCountText = (hopCount) => {
  if (!hopCount || hopCount <= 1) return 'Directo';
  return `${hopCount} saltos`;
};

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
      ? { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 8000 } 
      : {};

    mediaRecorder = new MediaRecorder(stream, options);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      await meshStore.createBroadcast({
        senderId: authStore.userId,
        senderName: authStore.userName,
        type: 'audio',
        audioBlob,
        coords: authStore.userCoords
      });
      stream.getTracks().forEach(t => t.stop());
    };

    mediaRecorder.start();
    isRecording.value = true;
    recordingTime.value = 0;
    
    timerInterval = setInterval(() => {
      recordingTime.value++;
      if (recordingTime.value >= 30) {
        stopRecording();
      }
    }, 1000);

  } catch (err) {
    dialogStore.alert({
      title: 'Permiso de Micrófono',
      message: 'No pudimos acceder al micrófono de tu dispositivo: ' + err.message,
      variant: 'warning'
    });
  }
};

const stopRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop();
    isRecording.value = false;
    clearInterval(timerInterval);
  }
};

const sendTextBroadcast = async () => {
  if (!textContent.value.trim()) return;

  const contentToSend = textContent.value.trim();
  textContent.value = '';

  await meshStore.createBroadcast({
    senderId: authStore.userId,
    senderName: authStore.userName,
    type: 'text',
    content: contentToSend,
    coords: authStore.userCoords
  });
};

const formatExactTime = (isoString) => {
  if (!isoString) return 'Ahora';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
</script>

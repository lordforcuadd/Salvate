<template>
  <div class="glass-card p-3.5 sm:p-5 border border-zinc-800 space-y-3.5 flex flex-col h-[680px] max-h-[88vh] relative">
    
    <!-- 1. COMPONENT HEADER & PEER CHANNEL SELECTOR -->
    <div class="flex flex-col gap-2 pb-2.5 border-b border-zinc-800/80 shrink-0">
      <div class="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageSquare class="w-4 h-4" />
          </div>
          <div class="min-w-0">
            <h3 class="text-sm sm:text-base font-black text-zinc-100 truncate">
              {{ activeFilterUser ? `Chat con ${activeFilterUser.name}` : 'Sala de Emergencia Comunitaria' }}
            </h3>
            <div class="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span :class="['w-2 h-2 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500']"></span>
              <span>{{ isConnected ? `${meshStore.peerConnections.length} dispositivo(s) en malla` : 'Modo Offline (En cola)' }}</span>
            </div>
          </div>
        </div>

        <!-- Mode Indicator & Outbox Status -->
        <div class="flex items-center gap-2 shrink-0">
          <span 
            v-if="pendingOutboxCount > 0" 
            class="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1"
            title="Mensajes esperando conexión para transmitirse"
          >
            <Clock class="w-3 h-3" />
            <span>{{ pendingOutboxCount }} en cola</span>
          </span>

          <AppBadge 
            :variant="meshStore.isOnlineMode ? 'safe' : 'p2p'" 
            size="xs" 
            :dot="true"
          >
            {{ meshStore.isOnlineMode ? 'Internet' : 'P2P Malla' }}
          </AppBadge>
        </div>
      </div>

      <!-- Quick Contact Filter Bar (Horizontal scrollable chips) -->
      <div class="flex items-center gap-1.5 overflow-x-auto py-1 pr-1 scrollbar-none text-xs">
        <button
          type="button"
          class="cursor-pointer active:scale-95"
          :class="[
            'px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1 shrink-0',
            !selectedRecipientId
              ? 'bg-emerald-500 text-zinc-950 shadow font-black'
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          ]"
          @click="selectedRecipientId = null"
        >
          <Radio class="w-3 h-3" />
          <span>Todos (Comunidad)</span>
          <span class="ml-0.5 px-1 py-0.2 rounded-full bg-black/20 text-[9px]">{{ meshStore.broadcasts.length }}</span>
        </button>

        <button
          v-for="user in availablePeerUsers"
          :key="user.id"
          type="button"
          class="cursor-pointer active:scale-95"
          :class="[
            'px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0',
            selectedRecipientId === user.id
              ? 'bg-emerald-500 text-zinc-950 shadow font-black'
              : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          ]"
          @click="selectedRecipientId = user.id"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span class="truncate max-w-[100px]">{{ user.name }}</span>
        </button>
      </div>
    </div>

    <!-- 2. SCROLLABLE CHAT FEED (WhatsApp / Instagram Chronological Layout) -->
    <div 
      ref="chatFeedRef"
      class="flex-1 overflow-y-auto pr-1 p-2 sm:p-3 bg-black/80 rounded-2xl border border-zinc-800/90 space-y-3 relative"
      @scroll="handleScroll"
    >
      <div v-if="filteredBroadcasts.length === 0" class="flex flex-col items-center justify-center h-full py-12 text-center text-zinc-500 space-y-2">
        <div class="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
          <MessageSquare class="w-6 h-6" />
        </div>
        <p class="text-xs font-medium">No hay mensajes en esta conversación.</p>
        <p class="text-[11px] text-zinc-600 max-w-xs">Escribe un mensaje de prueba o presiona el botón de voz para transmitir a tu red de emergencia.</p>
      </div>

      <!-- Chronologically Rendered Messages (Oldest at top, Newest at bottom) -->
      <template v-for="(group, gIdx) in groupedMessages" :key="group.dateLabel">
        
        <!-- Date Divider Pill -->
        <div class="flex items-center justify-center my-2">
          <span class="px-2.5 py-0.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-[10px] font-bold text-zinc-400 tracking-wide uppercase font-mono shadow-sm">
            {{ group.dateLabel }}
          </span>
        </div>

        <!-- Message Item -->
        <div
          v-for="b in group.messages"
          :id="`msg-${b.id}`"
          :key="b.id"
          :class="[
            'flex flex-col group relative max-w-[88%] sm:max-w-[75%] transition-all',
            b.senderId === authStore.userId ? 'ml-auto items-end' : 'mr-auto items-start'
          ]"
        >
          <!-- Context Hover Action Bar (Reply & React) -->
          <div 
            :class="[
              'opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 z-10 flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-full px-2 py-0.5 shadow-xl',
              b.senderId === authStore.userId ? 'right-0' : 'left-0'
            ]"
          >
            <button 
              type="button" 
              class="text-zinc-400 hover:text-emerald-400 text-xs p-1 cursor-pointer active:scale-95"
              title="Responder a este mensaje"
              @click="setReply(b)"
            >
              <CornerUpLeft class="w-3 h-3" />
            </button>
            <div class="h-2.5 w-[1px] bg-zinc-700"></div>
            <button 
              v-for="emoji in quickReactions" 
              :key="emoji"
              type="button"
              class="text-xs hover:scale-125 transition-transform p-0.5 cursor-pointer active:scale-95"
              @click="toggleReaction(b.id, emoji)"
            >
              {{ emoji }}
            </button>
          </div>

          <!-- The Bubble Card -->
          <div
            :class="[
              'px-3.5 py-2.5 rounded-2xl text-xs space-y-1.5 shadow-md relative break-words',
              b.senderId === authStore.userId
                ? 'bg-emerald-600/95 text-white border border-emerald-500/40 rounded-br-xs'
                : 'bg-zinc-900/95 text-zinc-100 border border-zinc-800 rounded-bl-xs'
            ]"
          >
            <!-- Sender Name (Shown on incoming peer messages) -->
            <div v-if="b.senderId !== authStore.userId" class="flex items-center justify-between gap-2 pb-0.5">
              <span class="text-[11px] font-black text-emerald-400 tracking-tight">{{ b.senderName }}</span>
              <span v-if="b.recipientId" class="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-zinc-300 font-mono">Privado</span>
            </div>

            <!-- Quoted / Reply Preview (if message is a reply) -->
            <div 
              v-if="b.replyTo"
              class="p-2 rounded-xl bg-black/40 border-l-3 border-emerald-400 text-[11px] space-y-0.5 opacity-90 cursor-pointer"
              @click="scrollToMessage(b.replyTo.id)"
            >
              <span class="font-bold text-emerald-300 block truncate">{{ b.replyTo.senderName }}</span>
              <p class="text-zinc-300 truncate text-[10px]">{{ b.replyTo.content }}</p>
            </div>

            <!-- Voice Note Player (Custom Styled Waveform Player) -->
            <div v-if="b.type === 'audio' && b.audioUrl" class="py-1 space-y-1.5 min-w-[200px] sm:min-w-[240px]">
              <div class="flex items-center gap-2.5">
                <button
                  type="button"
                  class="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                  @click="togglePlayAudio(b.id, b.audioUrl)"
                >
                  <Pause v-if="currentPlayingId === b.id && isAudioPlaying" class="w-4 h-4 fill-white" />
                  <Play v-else class="w-4 h-4 fill-white ml-0.5" />
                </button>

                <!-- Simulated Audio Waveform Bars -->
                <div class="flex-1 flex items-center gap-0.5 h-6">
                  <span 
                    v-for="(h, idx) in [40, 70, 30, 90, 50, 80, 60, 100, 45, 75, 35, 85, 65, 95, 55, 70]" 
                    :key="idx"
                    :style="{ height: `${h}%` }"
                    :class="[
                      'w-1 rounded-full transition-all',
                      currentPlayingId === b.id && audioProgress >= (idx / 16)
                        ? 'bg-white'
                        : 'bg-white/30'
                    ]"
                  ></span>
                </div>

                <Volume2 class="w-3.5 h-3.5 opacity-70 shrink-0" />
              </div>
            </div>

            <!-- Text Content -->
            <p v-else-if="b.content" class="leading-relaxed font-normal select-text whitespace-pre-wrap">
              {{ b.content }}
            </p>

            <!-- Metadata Footer: Timestamp + Delivery Ticks -->
            <div class="flex items-center justify-end gap-1.5 text-[10px] opacity-75 font-mono pt-0.5">
              <span>{{ formatExactTime(b.timestamp) }}</span>

              <!-- WhatsApp Style Status Ticks (Only for Current User's sent messages) -->
              <template v-if="b.senderId === authStore.userId">
                <!-- 1. Pending (Relojito) -->
                <span v-if="b.status === 'pending'" title="En cola offline. Se transmitirá al conectar.">
                  <Clock class="w-3 h-3 text-amber-300 animate-spin" />
                </span>
                <!-- 2. Sent (1 Check Gris) -->
                <span v-else-if="b.status === 'sent'" title="Transmitido a la red">
                  <Check class="w-3 h-3 text-zinc-300" />
                </span>
                <!-- 3. Delivered (2 Checks Grises) -->
                <span v-else-if="b.status === 'delivered'" title="Entregado al dispositivo del contacto">
                  <CheckCheck class="w-3.5 h-3.5 text-zinc-300" />
                </span>
                <!-- 4. Read (2 Checks Verde Esmeralda) -->
                <span v-else-if="b.status === 'read'" title="Leído / Visto">
                  <CheckCheck class="w-3.5 h-3.5 text-emerald-300 font-bold" />
                </span>
              </template>
            </div>
          </div>

          <!-- Tactical Reaction Chips Pill under Bubble -->
          <div 
            v-if="b.reactions && Object.keys(b.reactions).length > 0" 
            class="flex items-center gap-1 -mt-2 z-10 px-1"
          >
            <button
              v-for="(users, emoji) in b.reactions"
              :key="emoji"
              type="button"
              :class="[
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold border shadow transition-all flex items-center gap-0.5 cursor-pointer active:scale-95',
                users.includes(authStore.userId)
                  ? 'bg-emerald-950 border-emerald-500/60 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300'
              ]"
              @click="toggleReaction(b.id, emoji)"
            >
              <span>{{ emoji }}</span>
              <span class="text-[9px] opacity-80 font-mono">{{ users.length }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Scroll to Bottom Floating Pill Button -->
      <button
        v-if="showScrollBottomButton"
        type="button"
        class="fixed bottom-28 right-6 sm:bottom-24 sm:right-10 z-30 p-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-2xl transition-all cursor-pointer active:scale-95 flex items-center gap-1 text-xs font-black"
        @click="scrollToBottom(true)"
      >
        <ChevronDown class="w-4 h-4" />
      </button>
    </div>

    <!-- 3. REPLY-TO PREVIEW BAR (When Replying) -->
    <div 
      v-if="replyingToMessage" 
      class="p-2.5 rounded-xl bg-zinc-900 border-l-4 border-emerald-400 flex items-center justify-between gap-3 text-xs shrink-0 animate-slide-in"
    >
      <div class="min-w-0 flex-1">
        <span class="text-[11px] font-black text-emerald-400">Respondiendo a {{ replyingToMessage.senderName }}:</span>
        <p class="text-zinc-300 truncate text-[11px] mt-0.5">
          {{ replyingToMessage.type === 'audio' ? 'Nota de voz' : replyingToMessage.content }}
        </p>
      </div>
      <button 
        type="button" 
        class="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer active:scale-95"
        @click="cancelReply"
      >
        ✕
      </button>
    </div>

    <!-- 4. QUICK EMERGENCY PRESETS CHIPS -->
    <div class="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 shrink-0 text-xs">
      <button
        v-for="preset in quickPresets"
        :key="preset"
        type="button"
        class="px-2.5 py-1 rounded-xl bg-zinc-900/90 hover:bg-emerald-500/15 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer active:scale-95 shrink-0"
        @click="sendPreset(preset)"
      >
        {{ preset }}
      </button>
    </div>

    <!-- 5. ERGONOMIC INPUT BAR (Text / Audio Recording Interface) -->
    <div class="p-2 sm:p-2.5 rounded-2xl bg-zinc-900/95 border border-zinc-800 shrink-0">
      
      <!-- Audio Recording Active State -->
      <div v-if="isRecording" class="flex items-center justify-between gap-3 py-1 px-1">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0"></span>
          <span class="text-xs font-black text-rose-400 font-mono tracking-wide">
            Grabando Voz... {{ recordingTime }}s / 30s
          </span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            @click="cancelRecording"
          >
            <Trash2 class="w-3.5 h-3.5 text-rose-400" />
            <span class="hidden sm:inline">Descartar</span>
          </button>

          <button
            type="button"
            class="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
            @click="stopAndSendRecording"
          >
            <Send class="w-3.5 h-3.5" />
            <span>Enviar</span>
          </button>
        </div>
      </div>

      <!-- Standard Text Input State -->
      <div v-else class="flex items-center gap-2">
        <button
          type="button"
          class="w-10 h-10 rounded-xl bg-zinc-950 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 border border-zinc-800 flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95"
          title="Grabar nota de voz"
          @click="startRecording"
        >
          <Mic class="w-4 h-4" />
        </button>

        <input
          ref="inputRef"
          v-model="textContent"
          type="text"
          :placeholder="selectedRecipientId ? `Mensaje privado para ${activeFilterUser?.name || 'contacto'}...` : 'Escribe un mensaje de emergencia para toda la red...'"
          class="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-xs font-medium"
          @keydown.enter.prevent="sendTextMessage"
        />

        <button
          type="button"
          :disabled="!textContent.trim()"
          class="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
          @click="sendTextMessage"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useMeshStore } from '../stores/meshStore';
import { useAuthStore } from '../stores/authStore';
import { useDialogStore } from '../stores/dialogStore';
import AppBadge from './ui/AppBadge.vue';
import { 
  MessageSquare, 
  Mic, 
  Send, 
  Clock, 
  Check, 
  CheckCheck, 
  CornerUpLeft, 
  Radio, 
  ChevronDown, 
  Play, 
  Pause, 
  Volume2, 
  Trash2 
} from 'lucide-vue-next';

const meshStore = useMeshStore();
const authStore = useAuthStore();
const dialogStore = useDialogStore();

const chatFeedRef = ref(null);
const inputRef = ref(null);
const textContent = ref('');
const selectedRecipientId = ref(null);
const replyingToMessage = ref(null);
const showScrollBottomButton = ref(false);

const quickReactions = ['❤️', '👍', '🚨', '🙏', '⚠️', '🆗'];
const quickPresets = [
  'Estoy a salvo y en lugar seguro.',
  'Evacuando a punto de reunión.',
  'Requiero agua y botiquín.',
  'Zona sin energía eléctrica.',
  'Todo despejado por aquí.'
];

// Audio playback state
const currentPlayingId = ref(null);
const isAudioPlaying = ref(false);
const audioProgress = ref(0);
let activeAudioElement = null;

// Audio recording state
const isRecording = ref(false);
const recordingTime = ref(0);
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;

const availablePeerUsers = computed(() => {
  return (meshStore.users || []).filter(u => u.id !== authStore.userId);
});

const isConnected = computed(() => {
  return meshStore.peerConnections.some(c => c && c.open) || navigator.onLine;
});

const pendingOutboxCount = computed(() => {
  return (meshStore.broadcasts || []).filter(b => b.status === 'pending').length;
});

const activeFilterUser = computed(() => {
  if (!selectedRecipientId.value) return null;
  return meshStore.users.find(u => u.id === selectedRecipientId.value) || null;
});

const filteredBroadcasts = computed(() => {
  const all = [...(meshStore.broadcasts || [])];
  
  if (!selectedRecipientId.value) {
    // 1. SALA COMUNITARIA: Únicamente mensajes públicos (sin destinatario privado)
    return all
      .filter(b => !b.recipientId)
      .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0) || String(a.id).localeCompare(String(b.id)));
  }

  // 2. CHAT PRIVADO 1-A-1: Únicamente mensajes privados directos entre el usuario actual y el contacto seleccionado
  const targetId = selectedRecipientId.value;
  const myId = authStore.userId;

  return all
    .filter(b => 
      (b.senderId === myId && b.recipientId === targetId) ||
      (b.senderId === targetId && b.recipientId === myId)
    )
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0) || String(a.id).localeCompare(String(b.id)));
});

const groupedMessages = computed(() => {
  const groups = [];
  let currentDate = null;
  let currentList = [];

  filteredBroadcasts.value.forEach(msg => {
    const d = new Date(msg.timestamp || Date.now());
    const dateLabel = formatGroupDate(d);

    if (dateLabel !== currentDate) {
      if (currentList.length > 0) {
        groups.push({ dateLabel: currentDate, messages: currentList });
      }
      currentDate = dateLabel;
      currentList = [msg];
    } else {
      currentList.push(msg);
    }
  });

  if (currentList.length > 0) {
    groups.push({ dateLabel: currentDate, messages: currentList });
  }

  return groups;
});

const formatGroupDate = (date) => {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return 'Hoy';
  }
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Ayer';
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const formatExactTime = (isoString) => {
  if (!isoString) return 'Ahora';
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const scrollToBottom = (smooth = true) => {
  nextTick(() => {
    if (chatFeedRef.value) {
      chatFeedRef.value.scrollTo({
        top: chatFeedRef.value.scrollHeight + 1000,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
    setTimeout(() => {
      if (chatFeedRef.value) {
        chatFeedRef.value.scrollTop = chatFeedRef.value.scrollHeight + 1000;
      }
    }, 60);
    setTimeout(() => {
      if (chatFeedRef.value) {
        chatFeedRef.value.scrollTop = chatFeedRef.value.scrollHeight + 1000;
      }
    }, 250);
  });
};

const handleScroll = () => {
  if (!chatFeedRef.value) return;
  const { scrollTop, scrollHeight, clientHeight } = chatFeedRef.value;
  showScrollBottomButton.value = scrollHeight - scrollTop - clientHeight > 100;
};

const setReply = (msg) => {
  replyingToMessage.value = msg;
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const cancelReply = () => {
  replyingToMessage.value = null;
};

const scrollToMessage = (msgId) => {
  const el = document.getElementById(`msg-${msgId}`);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-emerald-400');
    setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400'), 2000);
  }
};

const toggleReaction = async (msgId, emoji) => {
  await meshStore.toggleMessageReaction(msgId, emoji);
};

const sendTextMessage = async () => {
  if (!textContent.value.trim()) return;

  const content = textContent.value.trim();
  const reply = replyingToMessage.value;
  const recipient = selectedRecipientId.value;

  textContent.value = '';
  replyingToMessage.value = null;

  await meshStore.createBroadcast({
    senderId: authStore.userId,
    senderName: authStore.userName,
    type: 'text',
    content,
    recipientId: recipient,
    replyTo: reply,
    coords: authStore.userCoords
  });

  scrollToBottom(true);
};

const sendPreset = (presetText) => {
  textContent.value = presetText;
  sendTextMessage();
};

const togglePlayAudio = (msgId, url) => {
  if (currentPlayingId.value === msgId && activeAudioElement) {
    if (isAudioPlaying.value) {
      activeAudioElement.pause();
      isAudioPlaying.value = false;
    } else {
      activeAudioElement.play();
      isAudioPlaying.value = true;
    }
    return;
  }

  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }

  currentPlayingId.value = msgId;
  isAudioPlaying.value = true;
  audioProgress.value = 0;

  activeAudioElement = new Audio(url);
  activeAudioElement.ontimeupdate = () => {
    if (activeAudioElement && activeAudioElement.duration) {
      audioProgress.value = activeAudioElement.currentTime / activeAudioElement.duration;
    }
  };
  activeAudioElement.onended = () => {
    isAudioPlaying.value = false;
    currentPlayingId.value = null;
    audioProgress.value = 0;
  };
  activeAudioElement.play().catch(() => {
    isAudioPlaying.value = false;
    currentPlayingId.value = null;
  });
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

    mediaRecorder.start();
    isRecording.value = true;
    recordingTime.value = 0;

    recordingTimer = setInterval(() => {
      recordingTime.value++;
      if (recordingTime.value >= 30) {
        stopAndSendRecording();
      }
    }, 1000);

  } catch (err) {
    dialogStore.alert({
      title: 'Micrófono Requerido',
      message: 'No pudimos acceder al micrófono: ' + err.message,
      variant: 'warning'
    });
  }
};

const cancelRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    isRecording.value = false;
    clearInterval(recordingTimer);
  }
};

const stopAndSendRecording = () => {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const reply = replyingToMessage.value;
      const recipient = selectedRecipientId.value;
      replyingToMessage.value = null;

      await meshStore.createBroadcast({
        senderId: authStore.userId,
        senderName: authStore.userName,
        type: 'audio',
        audioBlob,
        recipientId: recipient,
        replyTo: reply,
        coords: authStore.userCoords
      });

      scrollToBottom(true);
    };

    mediaRecorder.stop();
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
    isRecording.value = false;
    clearInterval(recordingTimer);
  }
};

watch(selectedRecipientId, async (newRecipient) => {
  await meshStore.markMessagesAsRead(newRecipient);
  scrollToBottom(false);
});

watch(() => filteredBroadcasts.value.length, () => {
  scrollToBottom(true);
});

onMounted(async () => {
  await meshStore.reloadFromDB();
  await meshStore.markMessagesAsRead(selectedRecipientId.value);
  scrollToBottom(false);
});

onBeforeUnmount(() => {
  cancelRecording();
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement = null;
  }
});
</script>

<template>
  <div class="glass-card p-4 sm:p-6 border border-zinc-800 relative overflow-hidden space-y-4">
    
    <!-- Title -->
    <div class="flex items-center justify-between pb-3 border-b border-zinc-800">
      <div>
        <h3 class="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2">
          <Zap class="w-5 h-5 text-amber-400 shrink-0" />
          <span>Herramientas de Rescate SOS</span>
        </h3>
        <p class="text-xs text-zinc-400">Silbato acústico de alta frecuencia y linterna estroboscópica Morse</p>
      </div>
    </div>

    <!-- Screen SOS Strobe Overlay -->
    <Teleport to="body">
      <div 
        v-if="isScreenStrobeActive"
        :class="['fixed inset-0 z-[999999] transition-colors duration-100 flex items-center justify-center p-4', strobeColor ? 'bg-white' : 'bg-black']"
      >
        <button 
          type="button"
          class="px-8 py-4 rounded-2xl bg-rose-600 text-white font-black text-base shadow-2xl border-2 border-white cursor-pointer active:scale-95 whitespace-nowrap"
          @click="stopTorchSOS"
        >
          DETENER LINTERNA SOS
        </button>
      </div>
    </Teleport>

    <div class="grid grid-cols-1 gap-3.5">
      
      <!-- TOOL 1: Rescue Whistle & Chirp Sweep -->
      <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 shadow-md">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Volume2 class="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 class="text-xs sm:text-sm font-bold text-zinc-100">Silbato & Barrido Acústico</h4>
          </div>
          <AppBadge variant="safe" size="xs">2500 Hz</AppBadge>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <!-- Constant 2500 Hz Button -->
          <button
            type="button"
            :class="[
              'h-11 sm:h-12 w-full text-xs font-black shadow transition-all flex flex-row items-center justify-center gap-2 rounded-xl cursor-pointer whitespace-nowrap active:scale-95',
              isWhistleActive && whistleMode === 'constant'
                ? 'bg-rose-600 text-white border-rose-400 animate-subtle-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/20'
            ]"
            @click="toggleWhistle('constant')"
          >
            <VolumeX v-if="isWhistleActive && whistleMode === 'constant'" class="w-4 h-4 text-white shrink-0" />
            <Volume2 v-else class="w-4 h-4 text-zinc-950 shrink-0" />
            <span>{{ isWhistleActive && whistleMode === 'constant' ? 'Detener 2500 Hz' : 'Silbato (2500 Hz)' }}</span>
          </button>

          <!-- Chirp Sweep Button -->
          <button
            type="button"
            :class="[
              'h-11 sm:h-12 w-full text-xs font-black shadow transition-all flex flex-row items-center justify-center gap-2 rounded-xl cursor-pointer whitespace-nowrap active:scale-95',
              isWhistleActive && whistleMode === 'chirp'
                ? 'bg-rose-600 text-white border-rose-400 animate-subtle-pulse'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            ]"
            @click="toggleWhistle('chirp')"
          >
            <Activity class="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{{ isWhistleActive && whistleMode === 'chirp' ? 'Detener Chirp' : 'Barrido Chirp' }}</span>
          </button>
        </div>
      </div>

      <!-- TOOL 2: Flashlight SOS Morse Code (... --- ...) -->
      <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3 shadow-md">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Flashlight class="w-4 h-4 text-amber-400 shrink-0" />
            <h4 class="text-xs sm:text-sm font-bold text-zinc-100">Linterna SOS Morse (... --- ...)</h4>
          </div>
          <AppBadge variant="warning" size="xs">Torch API</AppBadge>
        </div>

        <button
          type="button"
          :class="[
            'h-12 sm:h-13 w-full text-xs sm:text-sm font-black shadow transition-all flex flex-row items-center justify-center gap-2 rounded-xl cursor-pointer whitespace-nowrap active:scale-95',
            isTorchActive 
              ? 'bg-rose-600 text-white border-rose-400 animate-subtle-pulse'
              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
          ]"
          @click="toggleTorchSOS"
        >
          <ZapOff v-if="isTorchActive" class="w-4 h-4 text-white shrink-0" />
          <Zap v-else class="w-4 h-4 text-zinc-950 shrink-0" />
          <span>{{ isTorchActive ? 'Apagar Linterna SOS' : 'Activar Linterna Morse SOS' }}</span>
        </button>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useDialogStore } from '../stores/dialogStore';
import AppBadge from './ui/AppBadge.vue';
import { Zap, Volume2, VolumeX, Flashlight, ZapOff, Activity } from 'lucide-vue-next';

const dialogStore = useDialogStore();

const isWhistleActive = ref(false);
const whistleMode = ref('constant');

let audioCtx = null;
let oscillator = null;
let gainNode = null;
let chirpInterval = null;

const startWhistle = (mode = 'constant') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);

    if (mode === 'constant') {
      oscillator.frequency.setValueAtTime(2500, audioCtx.currentTime);
    } else {
      oscillator.frequency.setValueAtTime(1500, audioCtx.currentTime);
      let up = true;
      chirpInterval = setInterval(() => {
        if (!oscillator || !audioCtx) return;
        const targetFreq = up ? 3500 : 1500;
        oscillator.frequency.exponentialRampToValueAtTime(targetFreq, audioCtx.currentTime + 0.3);
        up = !up;
      }, 350);
    }

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    isWhistleActive.value = true;
    whistleMode.value = mode;
  } catch (e) {
    dialogStore.alert({
      title: 'Audio de Emergencia',
      message: 'No pudimos inicializar la salida de sonido de tu dispositivo: ' + e.message,
      variant: 'warning'
    });
  }
};

const stopWhistle = () => {
  if (chirpInterval) {
    clearInterval(chirpInterval);
    chirpInterval = null;
  }
  if (oscillator) {
    try { oscillator.stop(); } catch (e) {}
    oscillator.disconnect();
    oscillator = null;
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch (e) {}
    audioCtx = null;
  }
  isWhistleActive.value = false;
};

const toggleWhistle = (mode) => {
  if (isWhistleActive.value && whistleMode.value === mode) {
    stopWhistle();
  } else {
    stopWhistle();
    startWhistle(mode);
  }
};

const isTorchActive = ref(false);
const isScreenStrobeActive = ref(false);
const strobeColor = ref(false);

let mediaStream = null;
let torchTrack = null;
let morseLoopTimeout = null;

const toggleTorchSOS = async () => {
  if (isTorchActive.value) {
    stopTorchSOS();
  } else {
    await startTorchSOS();
  }
};

const startTorchSOS = async () => {
  isTorchActive.value = true;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    const tracks = mediaStream.getVideoTracks();
    if (tracks.length > 0) {
      torchTrack = tracks[0];
      const capabilities = torchTrack.getCapabilities ? torchTrack.getCapabilities() : {};
      if (capabilities.torch) {
        runMorseSequenceTorch();
        return;
      }
    }
  } catch (e) {
    console.warn('Torch API unsupported, using screen strobe fallback:', e);
  }

  // Release camera hardware immediately before falling back to screen strobe
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
    torchTrack = null;
  }

  runMorseSequenceScreen();
};

const runMorseSequenceTorch = async () => {
  const sequence = [
    200, 200, 200, 200, 200, 500,
    600, 200, 600, 200, 600, 500,
    200, 200, 200, 200, 200, 1000
  ];

  let stepIdx = 0;

  const step = async () => {
    if (!isTorchActive.value) return;
    const duration = sequence[stepIdx];
    const isOn = stepIdx % 2 === 0;

    if (torchTrack) {
      try {
        await torchTrack.applyConstraints({ advanced: [{ torch: isOn }] });
      } catch (e) {}
    }

    stepIdx = (stepIdx + 1) % sequence.length;
    morseLoopTimeout = setTimeout(step, duration);
  };

  step();
};

const runMorseSequenceScreen = () => {
  isScreenStrobeActive.value = true;
  const sequence = [
    200, 200, 200, 200, 200, 500,
    600, 200, 600, 200, 600, 500,
    200, 200, 200, 200, 200, 1000
  ];

  let stepIdx = 0;

  const step = () => {
    if (!isTorchActive.value) return;
    const duration = sequence[stepIdx];
    strobeColor.value = stepIdx % 2 === 0;

    stepIdx = (stepIdx + 1) % sequence.length;
    morseLoopTimeout = setTimeout(step, duration);
  };

  step();
};

const stopTorchSOS = () => {
  isTorchActive.value = false;
  isScreenStrobeActive.value = false;

  if (morseLoopTimeout) {
    clearTimeout(morseLoopTimeout);
    morseLoopTimeout = null;
  }

  if (torchTrack) {
    try {
      torchTrack.applyConstraints({ advanced: [{ torch: false }] });
      torchTrack.stop();
    } catch (e) {}
    torchTrack = null;
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
};

onBeforeUnmount(() => {
  stopWhistle();
  stopTorchSOS();
});
</script>

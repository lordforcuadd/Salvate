<template>
  <div class="relative w-full overflow-hidden rounded-2xl bg-black border border-zinc-800 shadow-inner flex flex-col items-center justify-center min-h-[260px]">
    
    <!-- Camera Video Preview -->
    <video
      ref="videoRef"
      autoplay
      playsinline
      muted
      class="w-full h-full max-h-[320px] object-cover rounded-2xl"
    ></video>

    <!-- Scanner Target Overlay HUD (Tactical Emerald) -->
    <div class="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
      <div class="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-500/60 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
        
        <!-- Corner Reticles -->
        <div class="absolute -top-1 -left-1 w-5 h-5 border-t-2 border-l-2 border-emerald-400 rounded-tl"></div>
        <div class="absolute -top-1 -right-1 w-5 h-5 border-t-2 border-r-2 border-emerald-400 rounded-tr"></div>
        <div class="absolute -bottom-1 -left-1 w-5 h-5 border-b-2 border-l-2 border-emerald-400 rounded-bl"></div>
        <div class="absolute -bottom-1 -right-1 w-5 h-5 border-b-2 border-r-2 border-emerald-400 rounded-br"></div>

        <!-- Scanning Laser Line Animation -->
        <div class="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#10b981] animate-bounce"></div>
      </div>
    </div>

    <!-- Top Status Overlay -->
    <div class="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
      <div class="px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur border border-zinc-800 text-[11px] text-zinc-300 font-bold flex items-center gap-1.5">
        <Camera class="w-3.5 h-3.5 text-emerald-400" />
        <span>Apunta al código QR</span>
      </div>

      <button
        type="button"
        class="pointer-events-auto p-1.5 rounded-xl bg-black/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all active:scale-95 cursor-pointer"
        @click="stopCamera"
        title="Detener cámara"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Fallback / Error State -->
    <div v-if="cameraError" class="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center p-4 text-center space-y-2">
      <CameraOff class="w-8 h-8 text-rose-400" />
      <p class="text-xs font-bold text-zinc-200">{{ cameraError }}</p>
      <p class="text-[11px] text-zinc-400">Puedes ingresar o pegar el código de texto manualmente.</p>
      <button
        type="button"
        class="h-8 px-3 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold active:scale-95 cursor-pointer"
        @click="startCamera"
      >
        Reintentar Cámara
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Camera, CameraOff, X } from 'lucide-vue-next';
import jsQR from 'jsqr';

const emit = defineEmits(['scanned', 'close']);

const videoRef = ref(null);
const cameraError = ref('');
let mediaStream = null;
let scanInterval = null;
let isScanningActive = false;
let barcodeDetector = null;

onMounted(async () => {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
    } catch (e) {
      barcodeDetector = null;
    }
  }
  await startCamera();
});

onBeforeUnmount(() => {
  stopCamera();
});

const startCamera = async () => {
  cameraError.value = '';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    mediaStream = stream;
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      videoRef.value.setAttribute('playsinline', 'true');
      await videoRef.value.play();
    }

    isScanningActive = true;
    startScanLoop();
  } catch (err) {
    console.warn('Camera scanner access error:', err);
    cameraError.value = 'No se pudo acceder a la cámara o el permiso fue denegado.';
  }
};

const startScanLoop = () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  const scanFrame = async () => {
    if (!isScanningActive || !videoRef.value) return;

    const video = videoRef.value;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      // 1. Try Native BarcodeDetector API (fastest on modern Android/Chrome)
      if (barcodeDetector) {
        try {
          const codes = await barcodeDetector.detect(video);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            handleScanSuccess(codes[0].rawValue);
            return;
          }
        } catch (e) {}
      }

      // 2. Pure JS fallback with jsQR
      try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        if (canvas.width > 0 && canvas.height > 0) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth'
          });

          if (qrCode && qrCode.data) {
            handleScanSuccess(qrCode.data);
            return;
          }
        }
      } catch (e) {}
    }

    if (isScanningActive) {
      scanInterval = requestAnimationFrame(scanFrame);
    }
  };

  scanInterval = requestAnimationFrame(scanFrame);
};

const handleScanSuccess = (rawData) => {
  stopCamera();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(80); } catch (e) {}
  }
  emit('scanned', rawData);
};

const stopCamera = () => {
  isScanningActive = false;
  if (scanInterval) {
    cancelAnimationFrame(scanInterval);
    scanInterval = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <div
      v-if="dialogStore.isOpen"
      class="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-all"
    >
      <div class="w-full max-w-sm bg-zinc-900 border border-zinc-700/90 rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-in relative overflow-hidden">
        
        <!-- Header & Icon -->
        <div class="flex items-center gap-3">
          <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border', iconContainerClass]">
            <component :is="dialogIcon" class="w-5 h-5" />
          </div>
          <div>
            <h4 class="text-base font-black text-zinc-100 leading-snug">{{ dialogStore.title }}</h4>
          </div>
        </div>

        <!-- Explanatory Message -->
        <p class="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {{ dialogStore.message }}
        </p>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
          <button
            v-if="dialogStore.cancelText"
            type="button"
            class="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            @click="dialogStore.handleCancel"
          >
            {{ dialogStore.cancelText }}
          </button>

          <button
            type="button"
            :class="['px-5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 shadow-md cursor-pointer', confirmBtnClass]"
            @click="dialogStore.handleConfirm"
          >
            {{ dialogStore.confirmText }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';
import { useDialogStore } from '../../stores/dialogStore';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-vue-next';

const dialogStore = useDialogStore();

const dialogIcon = computed(() => {
  if (dialogStore.variant === 'danger') return AlertTriangle;
  if (dialogStore.variant === 'warning') return AlertCircle;
  if (dialogStore.variant === 'safe') return CheckCircle2;
  return Info;
});

const iconContainerClass = computed(() => {
  if (dialogStore.variant === 'danger') return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
  if (dialogStore.variant === 'warning') return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
  if (dialogStore.variant === 'safe') return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
  return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
});

const confirmBtnClass = computed(() => {
  if (dialogStore.variant === 'danger') return 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30';
  if (dialogStore.variant === 'warning') return 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/25';
  if (dialogStore.variant === 'safe') return 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25';
  return 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/25';
});
</script>

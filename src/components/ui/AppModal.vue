<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md transition-all"
      @click.self="handleBackdropClick"
    >
      <div
        :class="[
          'w-full bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-slide-in',
          maxWidthClass[maxWidth] || maxWidthClass.md
        ]"
      >
        <!-- Modal Header -->
        <div class="px-4 py-3 sm:px-5 sm:py-4 border-b border-zinc-800 flex items-center justify-between gap-2.5 shrink-0 bg-zinc-900/95 sticky top-0 z-10">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            <slot name="header-icon"></slot>
            <div class="min-w-0 flex-1">
              <h3 class="text-sm sm:text-base font-black text-zinc-100 truncate leading-snug">{{ title }}</h3>
              <p v-if="subtitle" class="text-[11px] sm:text-xs text-zinc-400 truncate mt-0.5">{{ subtitle }}</p>
            </div>
          </div>

          <button
            type="button"
            class="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 flex items-center justify-center shrink-0 transition-all cursor-pointer"
            aria-label="Cerrar ventana"
            @click="close"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="p-5 overflow-y-auto space-y-4 text-sm text-zinc-300">
          <slot></slot>
        </div>

        <!-- Modal Footer Actions (Optional) -->
        <div v-if="$slots.footer" class="px-5 py-3.5 border-t border-zinc-800 bg-zinc-900/95 flex items-center justify-end gap-2.5 shrink-0">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: 'md' // 'sm' | 'md' | 'lg' | 'xl'
  },
  persistent: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'close']);

const maxWidthClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl'
};

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleBackdropClick = () => {
  if (!props.persistent) {
    close();
  }
};

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && props.modelValue && !props.persistent) {
    close();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

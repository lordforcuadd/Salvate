<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      'touch-btn font-black flex flex-row items-center justify-center gap-1.5 sm:gap-2 transition-all select-none cursor-pointer whitespace-nowrap shrink-0',
      sizeClasses[size] || sizeClasses.md,
      variantClasses[variant] || variantClasses.primary,
      fullWidth ? 'w-full' : '',
      customClass
    ]"
    @click="$emit('click', $event)"
  >
    <!-- Loading Spinner -->
    <span v-if="loading" class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"></span>
    
    <slot name="icon-left"></slot>
    <slot></slot>
    <slot name="icon-right"></slot>
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary'
  },
  size: {
    type: String,
    default: 'md' // 'sm' | 'md' | 'lg'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  customClass: {
    type: String,
    default: ''
  }
});

defineEmits(['click']);

const sizeClasses = {
  sm: 'h-9 px-3 text-xs rounded-xl',
  md: 'h-11 sm:h-12 px-4 text-xs sm:text-sm rounded-xl',
  lg: 'h-13 sm:h-14 px-5 text-sm sm:text-base rounded-2xl'
};

const variantClasses = {
  primary: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-95',
  secondary: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 active:scale-95',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 active:scale-95',
  safe: 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 active:scale-95',
  warning: 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 active:scale-95',
  outline: 'bg-transparent hover:bg-zinc-800/80 text-zinc-200 border border-zinc-700 active:scale-95',
  ghost: 'bg-transparent hover:bg-zinc-800/60 text-zinc-300 active:scale-95'
};
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 font-bold uppercase tracking-wider whitespace-nowrap transition-all',
      sizeClasses[size] || sizeClasses.sm,
      variantClasses[variant] || variantClasses.neutral,
      customClass
    ]"
  >
    <slot name="dot">
      <span v-if="dot" :class="['w-1.5 h-1.5 rounded-full shrink-0', dotColorClass || 'bg-current']"></span>
    </slot>
    <slot></slot>
  </span>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'neutral' // 'safe' | 'transit' | 'danger' | 'warning' | 'medical' | 'p2p' | 'neutral'
  },
  size: {
    type: String,
    default: 'sm' // 'xs' | 'sm' | 'md'
  },
  dot: {
    type: Boolean,
    default: false
  },
  dotColorClass: {
    type: String,
    default: ''
  },
  customClass: {
    type: String,
    default: ''
  }
});

const sizeClasses = {
  xs: 'text-[9px] px-2 py-0.5 rounded-md',
  sm: 'text-[11px] px-2.5 py-1 rounded-full',
  md: 'text-xs px-3 py-1.5 rounded-full'
};

const variantClasses = {
  safe: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  transit: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  medical: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  p2p: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  neutral: 'bg-zinc-800 text-zinc-300 border border-zinc-700'
};
</script>

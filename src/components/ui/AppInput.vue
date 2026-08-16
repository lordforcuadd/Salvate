<template>
  <div class="space-y-1.5 w-full">
    <label v-if="label" :for="id" class="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
      {{ label }}
      <span v-if="required" class="text-rose-400 font-black ml-0.5">*</span>
    </label>

    <div class="relative flex items-center">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :autofocus="autofocus"
        :class="[
          'w-full px-4 py-3 bg-zinc-950 border rounded-xl text-zinc-100 placeholder-zinc-500 font-medium text-sm transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
          hasError
            ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-zinc-700/80 focus:border-emerald-500 focus:ring-emerald-500/20',
          $slots.icon ? 'pr-11' : ''
        ]"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <div v-if="$slots.icon" class="absolute right-3.5 flex items-center pointer-events-none text-zinc-400">
        <slot name="icon"></slot>
      </div>
    </div>

    <p v-if="error" class="text-xs text-rose-400 font-semibold mt-1 flex items-center gap-1">
      <span>{{ error }}</span>
    </p>
    <p v-else-if="hint" class="text-[11px] text-zinc-400 mt-1">
      {{ hint }}
    </p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  id: {
    type: String,
    default: () => `input-${Math.random().toString(36).substr(2, 6)}`
  },
  label: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  autofocus: {
    type: Boolean,
    default: false
  },
  hasError: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  hint: {
    type: String,
    default: ''
  }
});

defineEmits(['update:modelValue', 'blur', 'focus']);
</script>

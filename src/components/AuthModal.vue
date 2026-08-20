<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
    <div class="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
      
      <!-- Icon & Emergency App Identity -->
      <div class="text-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-inner">
          <ShieldAlert class="w-7 h-7" />
        </div>

        <div>
          <h2 class="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">Sálvate</h2>
          <p class="text-xs text-zinc-400 mt-1">Red de Emergencias & Auxilio P2P Local</p>
        </div>
      </div>

      <!-- Single Field Frictionless Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <AppInput
          id="auth-name"
          v-model="inputName"
          label="Ingresa tu Nombre de Emergencia"
          placeholder="Ej. Carlos Pérez"
          required
          autofocus
        >
          <template #icon>
            <User class="w-4 h-4" />
          </template>
        </AppInput>

        <AppButton
          type="submit"
          variant="primary"
          size="lg"
          full-width
          :disabled="!inputName.trim()"
        >
          <span>Ingresar a Sálvate</span>
          <template #icon-right>
            <ArrowRight class="w-4 h-4 ml-1" />
          </template>
        </AppButton>
      </form>

      <!-- Security / Offline Badge Footer -->
      <div class="pt-3 border-t border-zinc-800/80 flex items-center justify-center gap-2 text-xs text-zinc-400 font-medium">
        <WifiOff class="w-4 h-4 text-emerald-400 shrink-0" />
        <span>100% Funcional sin Internet</span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore } from '../stores/notificationStore';
import AppInput from './ui/AppInput.vue';
import AppButton from './ui/AppButton.vue';
import { ShieldAlert, User, ArrowRight, WifiOff } from 'lucide-vue-next';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const inputName = ref('');

const handleSubmit = async () => {
  if (inputName.value.trim()) {
    authStore.loginWithName(inputName.value);
    // Request native notifications immediately upon entering
    notificationStore.requestPermission();
    // Capture user's real GPS position immediately
    await authStore.captureInitialLocation();
  }
};
</script>

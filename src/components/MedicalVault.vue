<template>
  <div class="glass-card p-4 sm:p-6 border border-zinc-800 space-y-4">
    
    <!-- Component Header (Medical Emerald / Teal Theme) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <HeartPulse class="w-5 h-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-base sm:text-lg font-black text-zinc-100 truncate">Bóveda Médica & Guía de Emergencia</h3>
          <p class="text-xs text-zinc-400 truncate">Fichas familiares, QR médico de rescate y mochilas de evacuación</p>
        </div>
      </div>

      <button
        v-if="subTab === 'profiles'"
        type="button"
        class="h-9 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex flex-row items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        @click="showAddMemberModal = true"
      >
        <Plus class="w-4 h-4 shrink-0" />
        <span>Agregar Familiar</span>
      </button>
    </div>

    <!-- Navigation Tabs for Medical Vault -->
    <div class="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800 scrollbar-none">
      <button 
        type="button"
        :class="[
          'px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
          subTab === 'profiles' ? 'bg-emerald-500 text-zinc-950 shadow-sm font-black' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
        ]"
        @click="subTab = 'profiles'"
      >
        Fichas Médicas ({{ medicalStore.familyMembers.length }})
      </button>

      <button 
        type="button"
        :class="[
          'px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
          subTab === 'guides' ? 'bg-emerald-500 text-zinc-950 shadow-sm font-black' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
        ]"
        @click="subTab = 'guides'"
      >
        Primeros Auxilios
      </button>

      <button 
        type="button"
        :class="[
          'px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer',
          subTab === 'checklists' ? 'bg-emerald-500 text-zinc-950 shadow-sm font-black' : 'bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800'
        ]"
        @click="subTab = 'checklists'"
      >
        Mochila 72h & Mascotas
      </button>
    </div>

    <!-- TAB 1: Family Profiles List -->
    <div v-if="subTab === 'profiles'" class="space-y-3">
      <div v-if="medicalStore.familyMembers.length === 0" class="text-center py-8 text-zinc-500 text-xs italic space-y-3">
        <p>No has registrado ninguna ficha médica familiar todavía.</p>
        <button 
          type="button"
          class="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm inline-flex flex-row items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          @click="showAddMemberModal = true"
        >
          <Plus class="w-4 h-4 shrink-0" />
          <span>Crear Primera Ficha Médica</span>
        </button>
      </div>

      <div 
        v-for="m in medicalStore.familyMembers" 
        :key="m.id"
        class="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-emerald-400 shrink-0">
              {{ m.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-sm font-bold text-zinc-100 truncate">{{ m.name }}</h4>
              <p class="text-xs text-zinc-400 mt-0.5 truncate">
                {{ m.relation }} • DNI: {{ m.dni || 'No registrado' }} • Sangre: <strong class="text-emerald-400 font-black">{{ m.bloodType }}</strong>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button 
              type="button"
              class="h-8 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex flex-row items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer active:scale-95 shrink-0"
              title="Generar Tarjeta QR de Rescate Offline"
              @click="openQRModal(m)"
            >
              <QrCode class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Ver QR</span>
            </button>

            <button 
              type="button"
              class="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Eliminar registro"
              @click="confirmDeleteMember(m)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300 pt-2 border-t border-zinc-800">
          <div>
            <span class="text-[10px] text-zinc-400 font-bold block uppercase">Alergias Conocidas:</span>
            <p class="font-medium text-zinc-200 mt-0.5">{{ m.allergies || 'Ninguna registrada' }}</p>
          </div>
          <div>
            <span class="text-[10px] text-zinc-400 font-bold block uppercase">Condiciones / Medicación:</span>
            <p class="font-medium text-zinc-200 mt-0.5">{{ m.conditions || 'Ninguna' }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Offline First-Aid Guides -->
    <div v-if="subTab === 'guides'" class="space-y-3">
      
      <!-- Quick Call Emergency Hotlines Bar -->
      <div class="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="flex items-center gap-2">
          <PhoneCall class="w-4 h-4 text-emerald-400 shrink-0" />
          <span class="text-xs font-bold text-zinc-200">Centrales Telefónicas de Emergencia (Perú)</span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <a 
            href="tel:116" 
            class="flex-1 sm:flex-none h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 whitespace-nowrap"
          >
            🚒 116 Bomberos
          </a>
          <a 
            href="tel:106" 
            class="flex-1 sm:flex-none h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 whitespace-nowrap"
          >
            🚑 106 SAMU
          </a>
        </div>
      </div>

      <!-- Segmented Accordion Guide Cards -->
      <div class="space-y-2.5">
        <div 
          v-for="guide in medicalStore.firstAidGuides" 
          :key="guide.id"
          class="rounded-2xl bg-zinc-900/90 border border-zinc-800 overflow-hidden transition-all shadow-sm"
        >
          <!-- Accordion Header Button -->
          <button
            type="button"
            class="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-zinc-800/50 transition-colors"
            @click="toggleGuide(guide.id)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div :class="['w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner', getGuideIconContainer(guide.id)]">
                <component :is="getGuideIconComponent(guide.id)" class="w-5 h-5" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <h4 class="text-xs sm:text-sm font-black text-zinc-100 leading-snug">{{ guide.title }}</h4>
                  <span :class="['text-[10px] font-black uppercase px-2 py-0.5 rounded-md border', getGuideBadgeColor(guide.id)]">
                    {{ guide.badge }}
                  </span>
                </div>
                <p class="text-[11px] text-zinc-400 mt-0.5 truncate">{{ guide.summary }}</p>
              </div>
            </div>

            <div class="w-7 h-7 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
              <ChevronUp v-if="isGuideOpen(guide.id)" class="w-4 h-4 text-emerald-400" />
              <ChevronDown v-else class="w-4 h-4 text-zinc-400" />
            </div>
          </button>

          <!-- Accordion Step-by-Step Body -->
          <div v-if="isGuideOpen(guide.id)" class="px-4 pb-4 pt-1 border-t border-zinc-800/80 space-y-2.5 animate-slide-in">
            <div 
              v-for="(step, idx) in guide.steps" 
              :key="idx"
              class="p-3 rounded-xl bg-black/60 border border-zinc-800 flex items-start gap-3"
            >
              <div class="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                0{{ idx + 1 }}
              </div>
              <p class="text-xs text-zinc-200 leading-relaxed font-medium">
                {{ step }}
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- TAB 3: Mochila 72h & Pet Care Checklists -->
    <div v-if="subTab === 'checklists'" class="space-y-4">
      
      <!-- Backpack Progress Bar -->
      <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
        <div class="flex items-center justify-between text-xs font-bold">
          <span class="text-zinc-200">Progreso de Preparación Mochila 72h</span>
          <span class="text-xs font-black text-emerald-400">{{ medicalStore.backpackProgress }}%</span>
        </div>
        <div class="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
          <div class="bg-emerald-400 h-full transition-all duration-300" :style="{ width: `${medicalStore.backpackProgress}%` }"></div>
        </div>
      </div>

      <!-- Checklist Items Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <label 
          v-for="item in medicalStore.backpackChecklist" 
          :key="item.id"
          class="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 flex items-center gap-3 cursor-pointer transition-all"
        >
          <input 
            type="checkbox" 
            :checked="item.checked" 
            class="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
            @change="medicalStore.toggleBackpackItem(item.id)"
          />
          <div class="min-w-0 flex-1">
            <span :class="['text-xs font-bold block truncate', item.checked ? 'line-through text-zinc-500' : 'text-zinc-200']">
              {{ item.title }}
            </span>
            <span class="text-[10px] text-zinc-400 block truncate">{{ item.desc }}</span>
          </div>
        </label>
      </div>

      <!-- Mascotas & Animales de Compañía -->
      <div class="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div class="flex items-center gap-2">
          <ShoppingBag class="w-4 h-4 text-emerald-400 shrink-0" />
          <h4 class="text-xs font-black text-zinc-200 uppercase tracking-wider">
            Plan de Evacuación para Mascotas
          </h4>
        </div>
        <ul class="text-xs text-zinc-300 space-y-1.5 list-disc pl-4 leading-relaxed">
          <li><strong>Arnés y Correa Resistente:</strong> Ten listo el arnés visible junto a tu mochila de 72 horas.</li>
          <li><strong>Agua y Comida Hermética:</strong> Porción racionada para 3 días en bolsas herméticas con cierre.</li>
          <li><strong>Placa de Identificación Física:</strong> Placa con tu número telefónico grabado directo en el collar.</li>
          <li><strong>Transportín / Canil Plegable:</strong> Para gatos y animales pequeños en refugios temporales.</li>
        </ul>
      </div>

    </div>

    <!-- Add Family Member Modal -->
    <AppModal
      v-model="showAddMemberModal"
      title="Nueva Ficha Médica Familiar"
      subtitle="Datos vitales almacenados localmente en tu teléfono"
      max-width="md"
    >
      <template #header-icon>
        <div class="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <HeartPulse class="w-5 h-5" />
        </div>
      </template>

      <form class="space-y-3.5 py-1" @submit.prevent="saveMember">
        <AppInput
          v-model="memberForm.name"
          label="Nombre Completo"
          placeholder="Ej. Carlos Mendoza"
          required
        />

        <div class="grid grid-cols-2 gap-3">
          <AppInput
            v-model="memberForm.relation"
            label="Parentesco"
            placeholder="Ej. Hijo / Madre"
            required
          />

          <div>
            <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Grupo Sanguíneo</label>
            <select v-model="memberForm.bloodType" class="w-full p-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 font-bold text-sm focus:outline-none focus:border-emerald-500">
              <option value="O+">O positive (O+)</option>
              <option value="O-">O negative (O-)</option>
              <option value="A+">A positive (A+)</option>
              <option value="A-">A negative (A-)</option>
              <option value="B+">B positive (B+)</option>
              <option value="B-">B negative (B-)</option>
              <option value="AB+">AB positive (AB+)</option>
              <option value="AB-">AB negative (AB-)</option>
            </select>
          </div>
        </div>

        <AppInput
          v-model="memberForm.allergies"
          label="Alergias Medicamentosas / Alimentarias"
          placeholder="Ej. Penicilina, Mariscos, AINES"
        />

        <div>
          <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Condiciones Médicas / Medicación</label>
          <textarea 
            v-model="memberForm.conditions" 
            rows="2" 
            placeholder="Ej. Asma, Diabetes tipo 2, Insulina cada 12h" 
            class="w-full p-3 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 text-sm font-medium focus:outline-none focus:border-emerald-500"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
          <button 
            type="button" 
            class="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
            @click="showAddMemberModal = false"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            class="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            Guardar Ficha
          </button>
        </div>
      </form>
    </AppModal>

    <!-- QR Code Viewer Modal -->
    <AppModal
      v-model="showQRModal"
      title="Tarjeta QR Médica de Rescate"
      subtitle="Escaneable por socorristas sin necesidad de internet"
      max-width="sm"
    >
      <div v-if="activeQRMember" class="text-center space-y-4 py-1">
        <div class="p-3 bg-white rounded-2xl inline-block border-2 border-emerald-500 shadow-xl mx-auto w-52 h-52" v-html="qrSvg"></div>

        <div>
          <h5 class="font-black text-zinc-100 text-base">{{ activeQRMember.name }}</h5>
          <p class="text-xs text-zinc-400 mt-0.5">Sangre: <strong class="text-emerald-400">{{ activeQRMember.bloodType }}</strong> • {{ activeQRMember.relation }}</p>
        </div>
      </div>

      <template #footer>
        <button 
          type="button" 
          class="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
          @click="showQRModal = false"
        >
          Cerrar Tarjeta QR
        </button>
      </template>
    </AppModal>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMedicalStore } from '../stores/medicalStore';
import { useDialogStore } from '../stores/dialogStore';
import AppModal from './ui/AppModal.vue';
import AppInput from './ui/AppInput.vue';
import { 
  HeartPulse, 
  Plus, 
  QrCode, 
  Trash2, 
  ShoppingBag, 
  PhoneCall, 
  Wind, 
  Flame, 
  Droplet,
  ChevronDown, 
  ChevronUp 
} from 'lucide-vue-next';
import { generateSVGQRCode } from '../utils/qrcode';

const medicalStore = useMedicalStore();
const dialogStore = useDialogStore();

const subTab = ref('profiles');
const openGuideIds = ref(['rcp']); // Default open RCP

const showAddMemberModal = ref(false);
const showQRModal = ref(false);
const activeQRMember = ref(null);
const qrSvg = ref('');

const memberForm = ref({
  name: '',
  relation: '',
  bloodType: 'O+',
  allergies: '',
  conditions: ''
});

onMounted(() => {
  medicalStore.initMedicalVault();
});

const isGuideOpen = (id) => openGuideIds.value.includes(id);

const toggleGuide = (id) => {
  if (openGuideIds.value.includes(id)) {
    openGuideIds.value = openGuideIds.value.filter(gId => gId !== id);
  } else {
    openGuideIds.value.push(id);
  }
};

const getGuideIconComponent = (id) => {
  if (id === 'rcp') return HeartPulse;
  if (id === 'heimlich') return Wind;
  if (id === 'burns') return Flame;
  if (id === 'hemorrhage') return Droplet;
  return HeartPulse;
};

const getGuideIconContainer = (id) => {
  if (id === 'rcp') return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
  if (id === 'heimlich') return 'bg-teal-500/15 border-teal-500/30 text-teal-400';
  if (id === 'burns') return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
  if (id === 'hemorrhage') return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
  return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
};

const getGuideBadgeColor = (id) => {
  if (id === 'rcp') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (id === 'heimlich') return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  if (id === 'burns') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (id === 'hemorrhage') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
};

const saveMember = async () => {
  if (!memberForm.value.name.trim()) return;
  await medicalStore.saveMember({ ...memberForm.value });
  memberForm.value = { name: '', relation: '', bloodType: 'O+', allergies: '', conditions: '' };
  showAddMemberModal.value = false;
};

const openQRModal = (member) => {
  activeQRMember.value = member;
  const qrPayload = JSON.stringify({
    n: member.name,
    b: member.bloodType,
    a: member.allergies,
    c: member.conditions
  });
  qrSvg.value = generateSVGQRCode(qrPayload, 190);
  showQRModal.value = true;
};

const confirmDeleteMember = (member) => {
  dialogStore.confirm({
    title: '¿Eliminar ficha médica?',
    message: `Se eliminará la ficha médica de "${member.name}". Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar Ficha',
    cancelText: 'Cancelar',
    variant: 'danger',
    onConfirm: async () => {
      await medicalStore.deleteMember(member.id);
    }
  });
};
</script>

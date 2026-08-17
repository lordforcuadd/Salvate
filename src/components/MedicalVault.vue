<template>
  <div class="glass-card p-3.5 sm:p-5 border border-zinc-800 space-y-4">
    
    <!-- Component Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <HeartPulse class="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-sm sm:text-base font-black text-zinc-100 truncate">Bóveda Médica & Guía de Emergencia</h3>
          <p class="text-[11px] sm:text-xs text-zinc-400 truncate">Fichas familiares, guías de auxilio y mochilas 72h</p>
        </div>
      </div>

      <button
        v-if="subTab === 'profiles'"
        type="button"
        class="h-9 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black flex flex-row items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        @click="showAddMemberModal = true"
      >
        <Plus class="w-3.5 h-3.5 shrink-0" />
        <span>Agregar Familiar</span>
      </button>
    </div>

    <!-- Navigation Tabs for Medical Vault -->
    <div class="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-2xl border border-zinc-800 text-xs">
      <button 
        type="button"
        :class="[
          'min-w-0 flex-1 py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer active:scale-95 truncate',
          subTab === 'profiles' ? 'bg-emerald-500 text-zinc-950 shadow font-black' : 'text-zinc-400 hover:text-zinc-200'
        ]"
        @click="subTab = 'profiles'"
      >
        Fichas ({{ medicalStore.familyMembers.length }})
      </button>

      <button 
        type="button"
        :class="[
          'min-w-0 flex-1 py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer active:scale-95 truncate',
          subTab === 'guides' ? 'bg-emerald-500 text-zinc-950 shadow font-black' : 'text-zinc-400 hover:text-zinc-200'
        ]"
        @click="subTab = 'guides'"
      >
        Primeros Auxilios
      </button>

      <button 
        type="button"
        :class="[
          'min-w-0 flex-1 py-2 px-2 rounded-xl font-bold transition-all text-center cursor-pointer active:scale-95 truncate',
          subTab === 'checklists' ? 'bg-emerald-500 text-zinc-950 shadow font-black' : 'text-zinc-400 hover:text-zinc-200'
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
          class="h-11 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs sm:text-sm inline-flex flex-row items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          @click="showAddMemberModal = true"
        >
          <Plus class="w-4 h-4 shrink-0" />
          <span>Crear Primera Ficha Médica</span>
        </button>
      </div>

      <div 
        v-for="m in medicalStore.familyMembers" 
        :key="m.id"
        class="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-emerald-400 shrink-0 text-sm">
              {{ m.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-xs sm:text-sm font-bold text-zinc-100 truncate">{{ m.name }}</h4>
              <p class="text-[11px] sm:text-xs text-zinc-400 mt-0.5 truncate">
                {{ m.relation }} • DNI: {{ m.dni || 'No reg.' }} • Sangre: <strong class="text-emerald-400 font-black">{{ m.bloodType }}</strong>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button 
              type="button"
              class="h-8 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex flex-row items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer active:scale-95 shrink-0"
              title="Generar Tarjeta QR de Rescate Offline"
              @click="openQRModal(m)"
            >
              <QrCode class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Ver QR</span>
            </button>

            <button 
              type="button"
              class="w-8 h-8 rounded-xl bg-zinc-800 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 transition-all cursor-pointer active:scale-95 flex items-center justify-center shrink-0"
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
        <div class="flex items-center gap-2 min-w-0">
          <PhoneCall class="w-4 h-4 text-emerald-400 shrink-0" />
          <span class="text-xs font-bold text-zinc-200 truncate">Centrales de Emergencia (Perú)</span>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <a 
            href="tel:116" 
            class="flex-1 sm:flex-none h-8 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow transition-all active:scale-95 whitespace-nowrap"
          >
            🚒 116 Bomberos
          </a>
          <a 
            href="tel:106" 
            class="flex-1 sm:flex-none h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1 shadow transition-all active:scale-95 whitespace-nowrap"
          >
            🚑 106 SAMU
          </a>
          <a 
            href="tel:105" 
            class="flex-1 sm:flex-none h-8 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1 shadow transition-all active:scale-95 whitespace-nowrap"
          >
            👮 105 Policía
          </a>
        </div>
      </div>

      <!-- Tactical Medical Safety Disclaimer -->
      <div class="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
        <Info class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div class="space-y-0.5 min-w-0 flex-1">
          <span class="font-bold text-amber-300 block text-[11px] uppercase tracking-wider">Aviso Médico de Emergencia</span>
          <p class="text-[11px] text-amber-200/90 leading-relaxed">
            Estas guías son una referencia táctica de auxilio inicial para situaciones de desastre y <strong>no reemplazan la atención médica profesional</strong> ni el diagnóstico calificado. Contacta siempre a los servicios de rescate (116 / 106) en cuanto sea posible.
          </p>
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
            class="w-full p-3.5 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-zinc-800/50 transition-colors"
            @click="toggleGuide(guide.id)"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div :class="['w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner', getGuideIconContainer(guide.id)]">
                <component :is="getGuideIconComponent(guide.id)" class="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h4 class="text-xs sm:text-sm font-black text-zinc-100 leading-snug truncate">{{ guide.title }}</h4>
                  <span :class="['text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border shrink-0', getGuideBadgeColor(guide.id)]">
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
          <div v-if="isGuideOpen(guide.id)" class="px-3.5 pb-3.5 pt-1 border-t border-zinc-800/80 space-y-2 animate-slide-in">
            <div 
              v-for="(step, idx) in guide.steps" 
              :key="idx"
              class="p-2.5 rounded-xl bg-black/60 border border-zinc-800/80 flex items-start gap-2.5"
            >
              <div class="w-5 h-5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                {{ idx + 1 }}
              </div>
              <p class="text-xs text-zinc-200 leading-relaxed font-medium min-w-0 flex-1">
                {{ step }}
              </p>
            </div>

            <!-- Caution Warnings Block -->
            <div v-if="guide.warnings" class="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-2 text-rose-200 text-xs">
              <AlertTriangle class="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div class="min-w-0 flex-1">
                <span class="font-bold text-rose-300 block text-[11px] uppercase tracking-wider">¡Atención Crucial!</span>
                <p class="text-[11px] text-rose-200/90 leading-snug mt-0.5">{{ guide.warnings }}</p>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>

    <!-- TAB 3: Mochila 72h & Pet Care Checklists -->
    <div v-if="subTab === 'checklists'" class="space-y-4">
      
      <!-- Sub-Selector: Mochila 72h vs Mascotas -->
      <div class="flex items-center gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
        <button
          type="button"
          :class="[
            'flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer active:scale-95',
            checklistMode === 'backpack' ? 'bg-zinc-800 text-emerald-400 font-black' : 'text-zinc-400'
          ]"
          @click="checklistMode = 'backpack'"
        >
          🎒 Mochila 72 Horas ({{ medicalStore.backpackProgress }}%)
        </button>

        <button
          type="button"
          :class="[
            'flex-1 py-1.5 rounded-lg font-bold transition-all text-center cursor-pointer active:scale-95',
            checklistMode === 'pets' ? 'bg-zinc-800 text-emerald-400 font-black' : 'text-zinc-400'
          ]"
          @click="checklistMode = 'pets'"
        >
          🐾 Mascotas ({{ medicalStore.petsProgress }}%)
        </button>
      </div>

      <!-- VIEW A: MOCHILA DE 72 HORAS -->
      <div v-if="checklistMode === 'backpack'" class="space-y-3">
        <!-- Progress Bar -->
        <div class="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="text-zinc-200">Progreso de Mochila de Supervivencia</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-emerald-400">{{ medicalStore.backpackProgress }}%</span>
              <button
                type="button"
                class="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                @click="medicalStore.resetChecklist('backpack')"
              >
                Reiniciar
              </button>
            </div>
          </div>
          <div class="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <div class="bg-emerald-400 h-full transition-all duration-300 rounded-full" :style="{ width: `${medicalStore.backpackProgress}%` }"></div>
          </div>
        </div>

        <!-- Checklist Items Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label 
            v-for="item in medicalStore.backpackItems" 
            :key="item.id"
            class="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 flex items-start gap-2.5 cursor-pointer transition-all active:scale-[0.99]"
          >
            <input 
              type="checkbox" 
              :checked="item.checked" 
              class="rounded accent-emerald-500 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
              @change="medicalStore.toggleBackpackItem(item.id)"
            />
            <div class="min-w-0 flex-1">
              <span class="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider block">{{ item.category }}</span>
              <span :class="['text-xs font-bold block truncate', item.checked ? 'line-through text-zinc-500' : 'text-zinc-200']">
                {{ item.title }}
              </span>
              <span class="text-[10px] text-zinc-400 block mt-0.5 leading-snug">{{ item.desc }}</span>
            </div>
          </label>
        </div>
      </div>

      <!-- VIEW B: MOCHILA DE MASCOTAS -->
      <div v-if="checklistMode === 'pets'" class="space-y-3">
        <!-- Pets Progress Bar -->
        <div class="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="text-zinc-200">Preparación de Kit para Mascotas</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-black text-emerald-400">{{ medicalStore.petsProgress }}%</span>
              <button
                type="button"
                class="text-[10px] text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
                @click="medicalStore.resetChecklist('pets')"
              >
                Reiniciar
              </button>
            </div>
          </div>
          <div class="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
            <div class="bg-teal-400 h-full transition-all duration-300 rounded-full" :style="{ width: `${medicalStore.petsProgress}%` }"></div>
          </div>
        </div>

        <!-- Pet Checklist Items Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label 
            v-for="item in medicalStore.petItems" 
            :key="item.id"
            class="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 flex items-start gap-2.5 cursor-pointer transition-all active:scale-[0.99]"
          >
            <input 
              type="checkbox" 
              :checked="item.checked" 
              class="rounded accent-teal-500 w-4 h-4 cursor-pointer mt-0.5 shrink-0"
              @change="medicalStore.togglePetItem(item.id)"
            />
            <div class="min-w-0 flex-1">
              <span :class="['text-xs font-bold block truncate', item.checked ? 'line-through text-zinc-500' : 'text-zinc-200']">
                {{ item.title }}
              </span>
              <span class="text-[10px] text-zinc-400 block mt-0.5 leading-snug">{{ item.desc }}</span>
            </div>
          </label>
        </div>

        <!-- Evacuation Tips -->
        <div class="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1.5 text-xs text-zinc-300">
          <div class="flex items-center gap-2 text-emerald-400 font-bold">
            <ShoppingBag class="w-4 h-4 shrink-0" />
            <span>Pautas Críticas de Evacuación con Mascotas</span>
          </div>
          <ul class="text-[11px] text-zinc-400 space-y-1 list-disc pl-4 leading-relaxed">
            <li>Mantén el arnés y correa colocados inmediatamente tras el inicio del sismo.</li>
            <li>No lleves a tu mascota suelta; el ruido de sirenas o derrumbes puede provocar que huya despavorida.</li>
            <li>Para gatos y animales pequeños, utiliza siempre transportín cerrado para evitar extravíos en albergues.</li>
          </ul>
        </div>
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

      <form class="space-y-3 py-1" @submit.prevent="saveMember">
        <AppInput
          v-model="memberForm.name"
          label="Nombre Completo"
          placeholder="Ej. Carlos Mendoza"
          required
        />

        <div class="grid grid-cols-2 gap-2.5">
          <AppInput
            v-model="memberForm.relation"
            label="Parentesco"
            placeholder="Ej. Hijo / Madre"
            required
          />

          <div>
            <label class="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Grupo Sanguíneo</label>
            <select v-model="memberForm.bloodType" class="w-full p-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 font-bold text-xs focus:outline-none focus:border-emerald-500">
              <option value="O+">O positivo (O+)</option>
              <option value="O-">O negativo (O-)</option>
              <option value="A+">A positivo (A+)</option>
              <option value="A-">A negativo (A-)</option>
              <option value="B+">B positivo (B+)</option>
              <option value="B-">B negativo (B-)</option>
              <option value="AB+">AB positivo (AB+)</option>
              <option value="AB-">AB negativo (AB-)</option>
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
            class="w-full p-2.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-zinc-100 text-xs font-medium focus:outline-none focus:border-emerald-500"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button 
            type="button" 
            class="h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
            @click="showAddMemberModal = false"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            class="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs shadow-md transition-all cursor-pointer active:scale-95 whitespace-nowrap"
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
      <div v-if="activeQRMember" class="text-center space-y-3.5 py-1">
        <div class="p-3 bg-white rounded-2xl inline-block border-2 border-emerald-500 shadow-xl mx-auto max-w-[220px]" v-html="qrSvg"></div>

        <div>
          <h5 class="font-black text-zinc-100 text-base">{{ activeQRMember.name }}</h5>
          <p class="text-xs text-zinc-400 mt-0.5">Sangre: <strong class="text-emerald-400 font-black">{{ activeQRMember.bloodType }}</strong> • {{ activeQRMember.relation }}</p>
        </div>

        <div class="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-1">
          <p><span class="text-zinc-500 font-bold">Alergias:</span> <span class="text-zinc-200">{{ activeQRMember.allergies || 'Ninguna' }}</span></p>
          <p><span class="text-zinc-500 font-bold">Condiciones:</span> <span class="text-zinc-200">{{ activeQRMember.conditions || 'Ninguna' }}</span></p>
        </div>
      </div>

      <template #footer>
        <button 
          type="button" 
          class="w-full h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
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
  ShieldAlert,
  Activity,
  AlertTriangle,
  Info,
  ChevronDown, 
  ChevronUp 
} from 'lucide-vue-next';
import { generateSVGQRCode } from '../utils/qrcode';

const medicalStore = useMedicalStore();
const dialogStore = useDialogStore();

const subTab = ref('profiles');
const checklistMode = ref('backpack'); // 'backpack' | 'pets'
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
  if (id === 'fractures') return ShieldAlert;
  if (id === 'shock') return Activity;
  return HeartPulse;
};

const getGuideIconContainer = (id) => {
  if (id === 'rcp') return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
  if (id === 'heimlich') return 'bg-teal-500/15 border-teal-500/30 text-teal-400';
  if (id === 'burns') return 'bg-amber-500/15 border-amber-500/30 text-amber-400';
  if (id === 'hemorrhage') return 'bg-rose-500/15 border-rose-500/30 text-rose-400';
  if (id === 'fractures') return 'bg-orange-500/15 border-orange-500/30 text-orange-400';
  if (id === 'shock') return 'bg-purple-500/15 border-purple-500/30 text-purple-400';
  return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
};

const getGuideBadgeColor = (id) => {
  if (id === 'rcp') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (id === 'heimlich') return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
  if (id === 'burns') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (id === 'hemorrhage') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (id === 'fractures') return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  if (id === 'shock') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
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
    tipo: 'FICHA_MEDICA_SALVATE',
    n: member.name,
    b: member.bloodType,
    a: member.allergies || 'Ninguna',
    c: member.conditions || 'Ninguna'
  });
  qrSvg.value = generateSVGQRCode(qrPayload, 200);
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

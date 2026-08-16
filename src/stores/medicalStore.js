import { defineStore } from 'pinia';
import { getAllDBItems, saveDBItem, deleteDBItem, getDBItem } from '../services/db';

export const useMedicalStore = defineStore('medical', {
  state: () => ({
    familyMembers: [], // Starts 100% empty for clean user testing from scratch
    checklists: {
      backpack: {
        'agua_embotellada': false,
        'alimentos_no_perecibles': false,
        'botiquin_primeros_auxilios': false,
        'linterna_pilas': false,
        'radio_portatil_am_fm': false,
        'silbato_emergencia': false,
        'manta_termica': false,
        'copia_documentos_dni': false,
        'dinero_en_efectivo_monedas': false,
        'cargador_portatil_powerbank': false,
        'mascarillas_kn95': false,
        'alcohol_gel_desinfectante': false
      },
      pets: {
        'comida_seca_mascota': false,
        'agua_mascota_3_dias': false,
        'correa_bozal_transportadora': false,
        'placa_identificacion': false,
        'copia_carnet_vacunas': false,
        'plato_desplegable': false,
        'manta_o_juguete_tranquilizante': false,
        'botiquin_veterinario_basico': false
      }
    },
    guides: [
      {
        id: 'rcp',
        title: 'Reanimación Cardiopulmonar (RCP)',
        subtitle: 'Para adultos y adolescentes inconscientes sin respiración',
        steps: [
          'Verifica la seguridad de la zona y comprueba si la persona responde dando palmadas en sus hombros.',
          'Llama de inmediato al 116 (Bomberos) o 106 (SAMU) o pide a alguien que lo haga.',
          'Coloca el talón de una mano en el centro del pecho (esternón) y la otra mano encima entrelazando los dedos.',
          'Comprime el pecho fuerte y rápido (100 a 120 compresiones por minuto) al ritmo constante.',
          'Permite que el pecho vuelva a su posición original entre cada compresión. No pares hasta que llegue ayuda médica.'
        ],
        icon: 'HeartPulse',
        badgeColor: 'bg-terracotta-500/10 text-terracotta-400 border-terracotta-500/20'
      },
      {
        id: 'heimlich',
        title: 'Maniobra de Heimlich (Asfixia)',
        subtitle: 'Obstrucción total de la vía aérea en persona consciente',
        steps: [
          'Pregunta: "¿Te estás ahogando?". Si la persona no puede hablar ni toser y se lleva las manos al cuello, actúa de inmediato.',
          'Colócate de pie detrás de la persona y rodea su cintura con tus brazos.',
          'Haz un puño con una mano y colócalo justo por encima del ombligo y por debajo del esternón.',
          'Sujeta tu puño con la otra mano y realiza presiones rápidas hacia adentro y hacia arriba.',
          'Repite las presiones fuertemente hasta que el objeto sea expulsado o la persona quede inconsciente.'
        ],
        icon: 'Wind',
        badgeColor: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
      },
      {
        id: 'burns',
        title: 'Tratamiento de Quemaduras',
        subtitle: 'Primeros auxilios térmicos y químicos inmediatos',
        steps: [
          'Enfría la quemadura de inmediato con agua fría de caño durante 10 a 20 minutos. NUNCA uses hielo directo.',
          'Retira suavemente ropa u objetos cerca de la zona antes de que se inflame, sin despegar ropa adherida a la piel.',
          'Cubre la quemadura sueltamente con una gasa estéril o paño limpio y seco.',
          'NUNCA revientes ampollas ni apliques crema, pasta dental, aceite o mantequilla.',
          'Acude inmediatamente a un centro de salud si la quemadura es extensa o afecta cara, manos o articulaciones.'
        ],
        icon: 'Flame',
        badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      },
      {
        id: 'hemorrhage',
        title: 'Control de Hemorragias',
        subtitle: 'Detención rápida de sangrado abundante',
        steps: [
          'Colócate guantes o usa una bolsa plástica si está disponible para evitar contacto directo con sangre.',
          'Aplica PRESIÓN DIRECTA sobre la herida sangrante usando una gasa, compresa o tela limpia.',
          'Mantén la presión firme e ininterrumpida por al menos 10 minutos seguidos sin levantar la gasa.',
          'Si la sangre atraviesa la gasa, agrega más capas por encima sin retirar las anteriores.',
          'Eleva la extremidad afectada por encima del nivel del corazón si no hay sospecha de fractura y traslada de urgencia.'
        ],
        icon: 'Droplet',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }
    ]
  }),

  getters: {
    backpackProgress: (state) => {
      const items = Object.values(state.checklists.backpack);
      if (items.length === 0) return 0;
      const checked = items.filter(Boolean).length;
      return Math.round((checked / items.length) * 100);
    },
    petsProgress: (state) => {
      const items = Object.values(state.checklists.pets);
      if (items.length === 0) return 0;
      const checked = items.filter(Boolean).length;
      return Math.round((checked / items.length) * 100);
    }
  },

  actions: {
    async initMedicalVault() {
      // Load family profiles strictly from IndexedDB
      const dbMembers = await getAllDBItems('medical_vault');
      this.familyMembers = dbMembers || [];

      // Load Checklists
      const dbBackpack = await getDBItem('checklists', 'backpack');
      if (dbBackpack) this.checklists.backpack = dbBackpack.data;

      const dbPets = await getDBItem('checklists', 'pets');
      if (dbPets) this.checklists.pets = dbPets.data;
    },

    async saveMember(member) {
      if (!member.id) {
        member.id = 'med-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
      }
      member.updatedAt = new Date().toISOString();

      const idx = this.familyMembers.findIndex(m => m.id === member.id);
      if (idx >= 0) {
        this.familyMembers[idx] = member;
      } else {
        this.familyMembers.push(member);
      }

      await saveDBItem('medical_vault', member);
    },

    async deleteMember(id) {
      this.familyMembers = this.familyMembers.filter(m => m.id !== id);
      await deleteDBItem('medical_vault', id);
    },

    async toggleChecklistItem(type, key) {
      if (this.checklists[type] && key in this.checklists[type]) {
        this.checklists[type][key] = !this.checklists[type][key];
        await saveDBItem('checklists', {
          key: type,
          data: this.checklists[type]
        });
      }
    }
  }
});

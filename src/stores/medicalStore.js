import { defineStore } from 'pinia';
import { getAllDBItems, saveDBItem, deleteDBItem, getDBItem } from '../services/db';

export const useMedicalStore = defineStore('medical', {
  state: () => ({
    familyMembers: [],
    backpackItems: [
      { id: 'agua', category: 'Hidratación & Nutrición', title: 'Agua embotellada (sin gas)', desc: '2 litros por persona al día (mínimo 3 días)', checked: false },
      { id: 'alimentos', category: 'Hidratación & Nutrición', title: 'Alimentos no perecibles', desc: 'Enlatados con abrelatas, barras energéticas, frutos secos', checked: false },
      { id: 'botiquin', category: 'Salud & Primeros Auxilios', title: 'Botiquín de primeros auxilios', desc: 'Gasas, vendas, alcohol, esparadrapo, analgésicos', checked: false },
      { id: 'mascarillas', category: 'Salud & Primeros Auxilios', title: 'Mascarillas KN95 / Quirúrgicas', desc: 'Protección contra polvo, cenizas y escombros', checked: false },
      { id: 'alcohol_gel', category: 'Salud & Primeros Auxilios', title: 'Alcohol en gel y toallitas', desc: 'Higiene y desinfección sin agua corriente', checked: false },
      { id: 'linterna', category: 'Herramientas & Comunicación', title: 'Linterna con pilas de repuesto', desc: 'LED de alta duración o linterna dinamo', checked: false },
      { id: 'radio', category: 'Herramientas & Comunicación', title: 'Radio portátil AM/FM', desc: 'Para sintonizar boletines de defensa civil y COE', checked: false },
      { id: 'silbato', category: 'Herramientas & Comunicación', title: 'Silbato de emergencia', desc: 'Para señalización acústica a rescatistas', checked: false },
      { id: 'powerbank', category: 'Herramientas & Comunicación', title: 'Batería externa (Powerbank)', desc: 'Cargada al 100% con cable para tu celular', checked: false },
      { id: 'navaja', category: 'Herramientas & Comunicación', title: 'Navaja multiusos / Cuchilla', desc: 'Herramienta para cortes y reparaciones rápidas', checked: false },
      { id: 'manta', category: 'Abrigo & Documentos', title: 'Manta térmica de aluminio', desc: 'Compacta, evita la hipotermia nocturna', checked: false },
      { id: 'documentos', category: 'Abrigo & Documentos', title: 'Copia de DNI y carnet de salud', desc: 'En bolsa hermética impermeable (Ziploc)', checked: false },
      { id: 'efectivo', category: 'Abrigo & Documentos', title: 'Dinero en efectivo (monedas y billetes pequeños)', desc: 'Los POS y cajeros no funcionarán sin energía', checked: false },
      { id: 'llaves', category: 'Abrigo & Documentos', title: 'Duplicado de llaves', desc: 'Vivienda y candados de paso', checked: false }
    ],
    petItems: [
      { id: 'comida_pet', category: 'Mascotas', title: 'Alimento seco / húmedo racionado', desc: 'Porción para mínimo 3 a 5 días en bolsa hermética', checked: false },
      { id: 'agua_pet', category: 'Mascotas', title: 'Agua para tu mascota', desc: '1 litro al día por cada 10kg de peso', checked: false },
      { id: 'correa_pet', category: 'Mascotas', title: 'Correa, collar y arnés resistente', desc: 'Listo y accesible junto a la mochila', checked: false },
      { id: 'placa_pet', category: 'Mascotas', title: 'Placa de identificación con teléfono', desc: 'Puesta en el collar con número legible', checked: false },
      { id: 'carnet_pet', category: 'Mascotas', title: 'Copia de carnet de vacunación', desc: 'En bolsa impermeable con foto actual', checked: false },
      { id: 'platos_pet', category: 'Mascotas', title: 'Platos plegables de silicona', desc: 'Para agua y alimento', checked: false },
      { id: 'manta_pet', category: 'Mascotas', title: 'Manta / prenda con olor familiar', desc: 'Ayuda a reducir el estrés post-traumático', checked: false },
      { id: 'canil_pet', category: 'Mascotas', title: 'Transportín o canil plegable', desc: 'Para evacuación segura de gatos y animales pequeños', checked: false }
    ],
    firstAidGuides: [
      {
        id: 'rcp',
        title: 'Reanimación Cardiopulmonar (RCP)',
        badge: 'Soporte Vital',
        summary: 'Para personas inconscientes que no respiran con normalidad',
        steps: [
          'Verifica la seguridad del entorno y estimula a la víctima dando palmadas firmes en sus hombros preguntando: "¿Estás bien?".',
          'Si no responde y no respira, llama o grita para que alguien llame de inmediato al 116 (Bomberos) o 106 (SAMU).',
          'Ubica el centro del pecho (mitad inferior del esternón). Coloca el talón de una mano y la otra mano entrelazada encima.',
          'Mantén los brazos rectos con los hombros directamente sobre tus manos y comprime fuerte y rápido a una profundidad de 5 a 6 cm.',
          'Ritmo: 100 a 120 compresiones por minuto (al compás de "Stayin Alive"). Permite que el pecho se expanda totalmente entre compresiones.',
          'No interrumpas las compresiones hasta que llegue la ambulancia o la víctima empiece a moverse.'
        ],
        warnings: 'NUNCA realices RCP en una persona que esté consciente o respire con normalidad.'
      },
      {
        id: 'heimlich',
        title: 'Maniobra de Heimlich (Atragantamiento)',
        badge: 'Vía Aérea',
        summary: 'Desobstrucción de vía aérea por cuerpo extraño en persona consciente',
        steps: [
          'Reconoce el signo universal de asfixia: manos al cuello, incapacidad para hablar, toser o respirar.',
          'Párate detrás de la persona y rodea su cintura con tus brazos inclinándola ligeramente hacia adelante.',
          'Cierra una mano formando un puño y colócalo dos dedos por encima del ombligo (justo debajo del esternón).',
          'Cubre tu puño con la otra mano y presiona con fuerza hacia adentro y hacia arriba en un movimiento rápido.',
          'Repite las compresiones abdominales continuas hasta que el objeto sea expulsado o la persona quede inconsciente.',
          'Si la persona pierde el conocimiento, colócala en el piso boca arriba e inicia compresiones de RCP.'
        ],
        warnings: 'En bebés menores de 1 año: alterna 5 palmadas en la espalda entre los omóplatos con 5 compresiones torácicas.'
      },
      {
        id: 'hemorrhage',
        title: 'Control de Hemorragias Severas',
        badge: 'Hemorragia',
        summary: 'Detención de sangrado activo masivo para prevenir shock hipovolémico',
        steps: [
          'Usa guantes o una bolsa plástica limpia para protegerte de fluidos biológicos.',
          'Aplica PRESIÓN DIRECTA y firme sobre la herida con un apósito, gasa o tela limpia utilizando el talón de tu mano.',
          'Mantén la presión continua por mínimo 10 a 15 minutos sin retirar la gasa para mirar si dejó de sangrar.',
          'Si el apósito se empapa de sangre, NO lo retires; coloca más apósitos encima y aumenta la fuerza de compresión.',
          'Realiza un vendaje compresivo firme fijando los apósitos.',
          'En hemorragias extremas de brazos o piernas que no ceden: coloca un torniquete 5 a 7 cm por encima de la herida (nunca sobre una articulación), aprieta hasta que cese el sangrado y anota la hora exacta.'
        ],
        warnings: 'NUNCA aflojes un torniquete una vez colocado. Solo personal médico en quirófano debe retirarlo.'
      },
      {
        id: 'burns',
        title: 'Tratamiento Inicial de Quemaduras',
        badge: 'Trauma Térmico',
        summary: 'Manejo de lesiones por fuego, calor, vapor o fricción',
        steps: [
          'Enfría la zona quemada inmediatamente con AGUA CORRIENTE templada/fría durante 15 a 20 minutos ininterrumpidos.',
          'Retira suavemente anillos, pulseras o ropa antes de que la zona se inflame, excepto si la ropa está adherida a la piel.',
          'Cubre la quemadura de forma holgada con film plástico limpio o gasa estéril humedecida.',
          'Mantén a la víctima abrigada para evitar la hipotermia tras el enfriamiento local.'
        ],
        warnings: 'NUNCA apliques hielo directo, pasta dental, mantequilla, aceites ni revientes ampollas.'
      },
      {
        id: 'fractures',
        title: 'Inmovilización de Fracturas y Esguinces',
        badge: 'Traumatología',
        summary: 'Estabilización de extremidades lesionadas por derrumbes o caídas',
        steps: [
          'No muevas a la persona a menos que exista un peligro inminente de derrumbe o incendio.',
          'Identifica deformidad evidente, dolor intenso, hinchazón o imposibilidad de mover la articulación.',
          'Inmoviliza la extremidad en la posición en que la encontraste, abarcando la articulación por encima y por debajo de la lesión.',
          'Usa tablillas improvisadas (maderas, cartón doblado, revistas gruesas) acolchadas con tela.',
          'Fija la férula con vendas o tiras de tela sin apretar excesivamente para no cortar la circulación sanguínea.',
          'Verifica que los dedos mantengan calor, sensibilidad y color rosado.'
        ],
        warnings: 'NUNCA intentes recolocar o enderezar un hueso fracturado deformado.'
      },
      {
        id: 'shock',
        title: 'Prevención y Manejo de Shock',
        badge: 'Estabilización',
        summary: 'Manejo del colapso circulatorio post-trauma o estrés severo',
        steps: [
          'Recuesta a la persona boca arriba en un lugar seguro y despejado.',
          'Eleva sus piernas unos 30 cm por encima del nivel del corazón (si no se sospecha lesión en columna o fractura en piernas).',
          'Aflójale la ropa ajustada (cuello, cinturón) para facilitar la respiración y ventilación.',
          'Abrígala con una manta térmica o casaca para conservar el calor corporal.',
          'Acompáñala hablándole con calma y transmitiéndole seguridad constante hasta que arribe el auxilio médico.'
        ],
        warnings: 'NO le des de comer ni beber líquidos a una persona en estado de shock.'
      }
    ]
  }),

  getters: {
    backpackProgress: (state) => {
      if (!state.backpackItems.length) return 0;
      const checked = state.backpackItems.filter(i => i.checked).length;
      return Math.round((checked / state.backpackItems.length) * 100);
    },
    petsProgress: (state) => {
      if (!state.petItems.length) return 0;
      const checked = state.petItems.filter(i => i.checked).length;
      return Math.round((checked / state.petItems.length) * 100);
    }
  },

  actions: {
    async initMedicalVault() {
      const dbMembers = await getAllDBItems('medical_vault');
      this.familyMembers = dbMembers || [];

      // Restore checklist states from IndexedDB
      const dbBackpack = await getDBItem('checklists', 'backpack');
      if (dbBackpack && dbBackpack.checkedIds) {
        this.backpackItems.forEach(item => {
          item.checked = dbBackpack.checkedIds.includes(item.id);
        });
      }

      const dbPets = await getDBItem('checklists', 'pets');
      if (dbPets && dbPets.checkedIds) {
        this.petItems.forEach(item => {
          item.checked = dbPets.checkedIds.includes(item.id);
        });
      }
    },

    async toggleBackpackItem(id) {
      const item = this.backpackItems.find(i => i.id === id);
      if (item) {
        item.checked = !item.checked;
        const checkedIds = this.backpackItems.filter(i => i.checked).map(i => i.id);
        await saveDBItem('checklists', { key: 'backpack', checkedIds });
      }
    },

    async togglePetItem(id) {
      const item = this.petItems.find(i => i.id === id);
      if (item) {
        item.checked = !item.checked;
        const checkedIds = this.petItems.filter(i => i.checked).map(i => i.id);
        await saveDBItem('checklists', { key: 'pets', checkedIds });
      }
    },

    async resetChecklist(type) {
      if (type === 'backpack') {
        this.backpackItems.forEach(i => i.checked = false);
        await saveDBItem('checklists', { key: 'backpack', checkedIds: [] });
      } else if (type === 'pets') {
        this.petItems.forEach(i => i.checked = false);
        await saveDBItem('checklists', { key: 'pets', checkedIds: [] });
      }
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
        this.familyMembers.unshift(member);
      }

      await saveDBItem('medical_vault', member);
    },

    async deleteMember(id) {
      this.familyMembers = this.familyMembers.filter(m => m.id !== id);
      await deleteDBItem('medical_vault', id);
    }
  }
});

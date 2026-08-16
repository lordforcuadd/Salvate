# 🛡️ Guía y Reglas para Agentes de IA — Proyecto Sálvate PWA

Bienvenido al repositorio de **Sálvate**. Como agente de IA colaborando en este proyecto, debes seguir estrictamente los siguientes principios y estándares operativos.

---

## 1. 📖 Lectura Obligatoria de Arquitectura
Antes de realizar cambios arquitectónicos o agregar nuevas funciones, consulta:
- [`PROJECT_OVERVIEW.md`](file:///c:/laragon/www/Salvate/PROJECT_OVERVIEW.md) para entender el ecosistema, stores de Pinia, IndexedDB y WebRTC.
- [`.agent/skills/salvate-audit/SKILL.md`](file:///c:/laragon/www/Salvate/.agent/skills/salvate-audit/SKILL.md) para ejecutar la auditoría de calidad.

---

## 2. ⚡ Protocolo Obligatorio en Cada Modificación
Cada vez que realices cambios en el código:
1. **Ejecutar Auditoría Estática**: Corre `npm run audit` para detectar posibles fugas de memoria o violaciones de patrones.
2. **Validar Compilación**: Asegúrate de que `npm run build` termine con código de salida `0` y cero errores de TypeScript/Vite.
3. **Ergonomía Móvil Táctica**:
   - Todo componente debe diseñarse **Mobile-First**.
   - Los títulos y etiquetas en contenedores Flexbox deben incluir `min-w-0 flex-1` y `truncate` para evitar desbordamientos en pantallas angostas (320px - 380px).
   - Los botones interactivos deben tener `cursor-pointer`, `active:scale-95` y tamaños táctiles cómodos (`h-9` a `h-12`).
4. **Consistencia Estética (Negro Puro & Verde Esmeralda)**:
   - Fondos: `bg-black` (`#000000`), `bg-zinc-950` (`#09090b`), `bg-zinc-900` (`#121215`).
   - Acentos primarios: `bg-emerald-500` (`#10b981`), `text-emerald-400`.
   - **PROHIBIDO** el uso de tonos azules genéricos (`sky-`, `blue-`) salvo en insignias explícitamente contextuales.
5. **Auto-Mejora de la Skill**:
   - Si solucionas un bug o descubres una nueva regla de resiliencia, agrégala al archivo [`.agent/skills/salvate-audit/SKILL.md`](file:///c:/laragon/www/Salvate/.agent/skills/salvate-audit/SKILL.md) en la sección *"Historial de Aprendizaje"*.

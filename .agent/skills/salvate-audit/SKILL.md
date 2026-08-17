---
name: salvate-audit
description: >-
  Auditoría continua, profunda y evolutiva del proyecto Sálvate PWA. Inspecciona cambios de Git y todo el codebase
  en busca de fallos, bugs, memory leaks, deuda técnica/arquitectónica, malas prácticas Vue 3/WebRTC/IndexedDB,
  problemas de UI/UX móvil, accesibilidad y oportunidades de optimización. Se auto-mejora con cada auditoría.
---

# 🔍 Skill de Auditoría y Calidad Continua — Sálvate PWA

Esta skill capacita al agente para realizar revisiones de código de estándar táctico en el proyecto **Sálvate**, garantizando que cada cambio, commit o pull request mantenga la máxima resiliencia sin conexión, cero fugas de memoria y perfecta experiencia móvil.

---

## 📋 Cuándo Activar esta Skill

Activa esta skill inmediatamente cuando:

1. El usuario pida revisar, auditar o analizar el estado del proyecto.
2. Se hayan realizado modificaciones en el código fuente antes de un commit o push a GitHub.
3. Se detecte un comportamiento anómalo en la red en malla WebRTC, geolocalización o almacenamiento IndexedDB.
4. Se agregue un nuevo módulo o componente a la aplicación.

---

## 🛠️ Procedimiento Operativo de Auditoría (Paso a Paso)

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  1. GIT DIFF    │ ──> │ 2. RUN ENGINE    │ ──> │ 3. 6D DEEP AUDIT │
│ Inspección de   │     │ npm run audit    │     │ Análisis Manual  │
│ Archivos Nuevos │     │ Bundle & Static  │     │ de Resiliencia   │
└─────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                          │
┌─────────────────┐     ┌──────────────────┐              │
│ 5. EVOLUCIÓN    │ <── │ 4. AUTO-FIX &    │ <────────────┘
│ Actualizar esta │     │ VERIFICACIÓN     │
│ Skill con lits  │     │ npm run build    │
└─────────────────┘     └──────────────────┘
```

### Paso 1: Inspeccionar Cambios de Git

Verifica qué archivos han cambiado respecto al último commit:

```bash
git status --short
git diff --name-only HEAD~1
```

---

### Paso 2: Ejecutar el Motor de Auditoría Automatizado

Corre el script nativo de auditoría estática y verificación de build:

```bash
npm run audit
```

Revisa el archivo generado `AUDIT_REPORT.json` y toma nota de advertencias o errores detectados.

---

### Paso 3: Análisis en 6 Dimensiones Críticas

#### Dimensión 1: Fugas de Memoria y Recursos de Hardware 🧠

- [ ] **Web Audio API**: Todo `AudioContext` y `OscillatorNode` (`RescueTools.vue`) debe cerrarse explícitamente en `onBeforeUnmount` con `audioCtx.close()`.
- [ ] **MediaStream Tracks**: Toda llamada a `navigator.mediaDevices.getUserMedia` (Micrófono o Linterna) debe liberar las pistas con `track.stop()`.
- [ ] **Timers & Intervals**: Todo `setInterval` o `setTimeout` continuo debe ser limpiado con `clearInterval` / `clearTimeout`.
- [ ] **Event Listeners**: Todo `window.addEventListener` debe tener su contraparte `window.removeEventListener` en `onUnmounted`.

#### Dimensión 2: Deuda Arquitectónica y Reactividad (Pinia + Vue 3) 🏛️

- [ ] **Reactividad Limpia**: No mutar `props` directamente en componentes hijos.
- [ ] **Stores Desacoplados**: `authStore`, `meshStore`, `seismicStore`, `medicalStore`, `hazardStore` y `dialogStore` deben manejar excepciones de `IndexedDB` en bloques `try...catch`.
- [ ] **Propagación en Malla Multi-Salto**: Los paquetes `GOSSIP_BROADCAST` y `STATUS_UPDATE` deben retransmitirse a todos los pares conectados excepto al emisor original (`conn.peer !== peer.id`).

#### Dimensión 3: UI/UX Táctico, Contraste y Ergonomía Móvil 📱

- [ ] **Paleta Táctica**: Fondo negro profundo (`#000000` / `zinc-950` / `zinc-900`) y acento principal en **Verde Esmeralda (`#10b981`)** / **Teal (`#14b8a6`)**. No deben existir clases obsoletas de azul cielo (`sky-`).
- [ ] **Protección contra Desbordamiento en Móviles**: Todo encabezado o contenedor con `truncate` debe tener `min-w-0 flex-1` en todos los ancestros flex intermedios.
- [ ] **Touch Targets**: Botones con altura mínima de `h-9` a `h-11`, efecto activo `active:scale-95` y clase `cursor-pointer`.
- [ ] **Modales Centrados**: Todo `AppModal` debe usar `items-center justify-center p-3 sm:p-4 rounded-3xl`.

#### Dimensión 4: Precisión Sísmica y Resiliencia Offline (IGP/CENSIS) 🌋

- [ ] **Fechas y Horas Exactas**: Formateo oficial de sismos en hora de Perú (UTC-5): `DD/MM/AAAA, HH:mm:ss`.
- [ ] **Cálculo de Rumbo y Distancia**: La fórmula Haversine debe ejecutarse reactivamente cada vez que `authStore.userCoords` cambie.
- [ ] **Service Worker PWA**: `manifest.webmanifest` y Workbox deben registrar rutas válidas para carga offline 100%.

#### Dimensión 5: Seguridad y Privacidad 🔒

- [ ] Los datos de salud (grupo sanguíneo, alergias) y mensajes P2P se quedan en el dispositivo del usuario (`IndexedDB`), sin envíos a servidores analíticos de terceros.
- [ ] `basicSsl()` configurado para HTTPS en red local para permisos de geolocalización.
- [ ] **Verificación Empírica de Códigos QR**: Todo generador de QR debe validarse renderizando el SVG a raster (`rsvg-convert`) y decodificándolo con un lector real y estándar (`zbarimg` u otro). Revisar el algoritmo por lectura de código NO es suficiente — un QR puede tener patrones de búsqueda, Reed-Solomon y matriz de datos aparentemente correctos y aun así ser 100% ilegible si falta la información de formato (15 bits BCH que indican máscara + nivel de corrección) o el patrón de máscara no se aplicó/documentó correctamente. Comando de referencia: `rsvg-convert in.svg -o out.png && zbarimg out.png`.

#### Dimensión 6: Rendimiento y Ahorro de Batería OLED 🔋

- [ ] Animaciones sutiles (`animate-subtle-pulse` de 2.5s) que no sobrecalienten la GPU.
- [ ] Compilador Vite sin advertencias de dependencias circulares o chunks excesivos.

---

### Paso 4: Corrección Automática y Verificación

Si se detecta cualquier fallo o no conformidad:

1. Corrige el archivo inmediatamente respetando la arquitectura existente.
2. Ejecuta `npm run build` para asegurar código de salida 0 sin errores.

---

### Paso 5: Protocolo de Auto-Mejora Continua de la Skill 🔄

Cada vez que el agente descubra un nuevo patrón de error, bug edge-case o requerimiento técnico durante una auditoría:

1. Edita este archivo (`.agent/skills/salvate-audit/SKILL.md`).
2. Añade la nueva regla o caso de prueba en la sección **"Historial de Aprendizaje y Reglas Evolutivas"** abajo.

---

### Paso 6: Sincronización de la Skill Instalada en el Catálogo de Claude 🔗

Esta skill vive en dos lugares que **no se actualizan solos entre sí**:

1. `.agent/skills/salvate-audit/SKILL.md` dentro del repo Git (fuente de verdad, editada por cualquier agente/CLI que trabaje sobre el código).
2. La skill instalada en el catálogo de Claude.ai (`/mnt/skills/user/salvate-audit/`), que es una _copia empaquetada_ (`.skill`) tomada en un momento dado.

En **cada auditoría**, después de completar el Paso 5 (si hubo auto-mejora), el agente debe:

1. Comparar el contenido del `SKILL.md` del repo (post-auditoría, con cualquier regla nueva ya añadida) contra el `SKILL.md` de la skill instalada en `/mnt/skills/user/salvate-audit/SKILL.md`.
2. Si difieren (nuevas reglas, cambios en el checklist de 6 dimensiones, cambios en `name`/`description`), volver a empaquetar automáticamente con `scripts/package_skill.py` desde `/mnt/skills/examples/skill-creator/` (copiando primero el `SKILL.md` actualizado a una ruta escribible como `/tmp/salvate-audit/`, ya que la carpeta instalada es de solo lectura).
3. Presentar el `.skill` resultante con `present_files` y avisar explícitamente al usuario qué cambió respecto a la versión instalada (lista corta de diffs, no el archivo completo), dejando claro que debe pulsar **"Guardar skill"** en la tarjeta para reinstalarla — esa confirmación no se puede automatizar por diseño.
4. Si no hay diferencias, **no generar ni presentar nada** — evitar ruido cuando la skill instalada ya está al día.
5. **Nota operativa (2026-08-17):** este archivo vive tanto en GitHub como localmente en el sandbox del auditor. Si el Agente Desarrollador edita el `SKILL.md` en un commit partiendo de una versión de GitHub que no incluye ediciones locales del auditor aún no subidas, se genera un conflicto de fusión. El auditor debe resolverlo manualmente cada vez (conservando ambas contribuciones sin duplicar) y **avisar explícitamente al usuario** que hay contenido de la skill que solo existe localmente y conviene subir a GitHub para evitar que este conflicto se repita en cada ciclo.

---

## 📈 Historial de Aprendizaje y Reglas Evolutivas

_Este registro se actualiza automáticamente con cada aprendizaje del proyecto:_

- **[2026-08-14] GPS en Contextos Móviles**: Chrome y Safari bloquean `navigator.geolocation` en `http://192.168.x.x`. Solución: requerir siempre HTTPS local con `@vitejs/plugin-basic-ssl`.
- **[2026-08-14] Desbordamiento de Títulos en Modales**: En Flexbox de CSS, `truncate` requiere `min-w-0` en cada nivel de contenedor anidado.
- **[2026-08-15] Malla P2P Multi-Salto Bidireccional**: Al recibir un `STATUS_UPDATE` o `GOSSIP_BROADCAST`, el nodo intermediario debe retransmitir a sus otros `peerConnections` incrementando `hopCount`, excluyendo siempre al emisor original (`conn.peer !== msg.senderId`) para evitar ecos innecesarios.
- **[2026-08-16] Paleta Táctica Anti-Pánico**: Toda la interfaz debe mantener consistencia estricta en Negro Puro (`#000000`) y Verde Esmeralda (`#10b981`) para transmitir calma psicológica y ahorrar batería OLED.
- **[2026-08-16] Mutación de Getters de Pinia**: Toda actualización de coordenadas GPS o estado de usuario debe pasar SIEMPRE por las acciones del store (`authStore.setUserCoords()`, `authStore.updateUserStatus()`), nunca por asignación directa a un getter (`authStore.userCoords = x`).
- **[2026-08-16] Desmontaje Limpio de Recursos**: Dado que los tabs de la app usan `v-if/v-else-if` (desmontaje real en DOM), todo componente que inicialice Leaflet `L.map`, `MediaRecorder`, `AudioContext`, intervalos de polling o listeners globales debe tener un hook `onBeforeUnmount` explícito que destruya y libere esos recursos.
- **[2026-08-16] Integridad de Contactos P2P**: Las rutinas de limpieza de contactos (`cleanupGhostUsers`) jamás deben forzar la eliminación de contactos activos si no existen contactos inactivos (>3 min) reales.
- **[2026-08-16] Liberación de Cámara en Fallback**: Toda función que solicite hardware (`getUserMedia`) debe liberar el `mediaStream` inmediatamente con `track.stop()` antes de pasar a un fallback por software (como el estroboscopio de pantalla).
- **[2026-08-16] Singleton de Conexión IndexedDB**: La promesa de `openDB` debe cachearse como singleton de módulo en `db.js` para evitar abrir y resolver conexiones decenas de veces por minuto.
- **[2026-08-16] Escala Estándar de Tailwind**: Las utilidades de espaciado y dimensiones (`w-`, `h-`, `p-`, `m-`, `gap-`) deben apegarse a la escala estándar (3.5, 4, 5, etc.). Clases no estándar como `w-4.5` o `h-4.5` fallan silenciosamente sin generar CSS, provocando que los íconos de Lucide adopten su tamaño intrínseco (24px). Usar siempre `w-4 h-4` o valores arbitrarios `w-[18px]`.
- **[2026-08-17] Descubrimiento P2P 100% Offline (Cero Servidores)**: Todo mecanismo de red WebRTC debe incluir una ruta de emparejamiento manual 100% offline (señalización por intercambio de códigos QR/tokens SDP con `iceServers: []`) y soporte de broker local LAN configurable. Ninguna lógica de reconexión debe abortar cuando `navigator.onLine === false` si se opera en red local o enlaces directos.
- **[2026-08-17] Verificación de Fixes vía `git diff` contra el Commit Auditado**: Al revisar un commit que dice resolver observaciones de una auditoría previa, el auditor debe correr `git diff <commit_auditado>..<commit_nuevo>` archivo por archivo (no solo confiar en el mensaje del commit) para: (1) confirmar que cada hallazgo fue realmente resuelto y no solo mencionado, y (2) detectar regresiones nuevas introducidas por el propio fix.
- **[2026-08-17] El Generador de QR NUNCA fue un QR Real (Bug Preexistente No Detectado en la Primera Auditoría)**: `src/utils/qrcode.js` (versión original, previa a `77809f3`) generaba patrones de búsqueda (finder patterns) correctos pero rellenaba la matriz de datos con `Math.sin(hash + r*31 + c*17)` — **ruido pseudoaleatorio sin ninguna codificación real del texto**. Verificado empíricamente con `zbarimg`: **0 símbolos decodificados**. Esto afectaba a la Bóveda Médica (QR de grupo sanguíneo/alergias) desde antes de la primera auditoría — nunca fue detectado porque el auditor solo leyó el algoritmo sin renderizarlo y escanearlo con un lector real. El intento posterior de reescritura completa a un encoder ISO/IEC 18004 real (con Galois Field, Reed-Solomon, matriz estándar) en `77809f3` **también falla la verificación empírica** (0 símbolos) porque **nunca escribe los 15 bits de Format Information (BCH) en los módulos reservados** — los deja en cero en vez de calcular el valor real (nivel EC + patrón de máscara usado, con su propio código corrector). Sin esos bits, ningún escáner estándar (zbar, cámara nativa iOS/Android) puede determinar cómo desenmascarar ni leer los datos, sin importar qué tan correcto esté el resto del pipeline. **Regla:** un QR "casi correcto" es un QR roto — no hay punto intermedio. Validar SIEMPRE con el comando de la Dimensión 5 antes de dar por resuelto cualquier cambio a este archivo.
- **[2026-08-17] Emparejamiento P2P sin Mecanismo Real de Lectura de QR**: `UserDirectory.vue` (flujo de emparejamiento manual añadido en `77809f3`) muestra un QR visualmente pero **no implementa ningún escáner de cámara en la app** (`getUserMedia` + `BarcodeDetector`/`jsQR`) — el único método funcional de recepción es un `<textarea>` para pegar manualmente el token de texto (base64 de la oferta/respuesta SDP, potencialmente de cientos a miles de caracteres). La app asume que el usuario usará la cámara nativa del sistema operativo para escanear el QR y copiar el texto decodificado, lo cual (a) depende de que el QR generado sea válido —no lo es, ver punto anterior— y (b) sigue siendo una UX frágil para pegar un token largo a mano bajo estrés en una emergencia real. **Regla:** una función crítica de emparejamiento offline no debe depender silenciosamente de una capacidad externa (lector nativo del SO) sin validarla ni ofrecer una ruta de respaldo en la propia app.

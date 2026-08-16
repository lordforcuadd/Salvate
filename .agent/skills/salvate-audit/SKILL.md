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

## 📈 Historial de Aprendizaje y Reglas Evolutivas

*Este registro se actualiza automáticamente con cada aprendizaje del proyecto:*

- **[2026-08-14] GPS en Contextos Móviles**: Chrome y Safari bloquean `navigator.geolocation` en `http://192.168.x.x`. Solución: requerir siempre HTTPS local con `@vitejs/plugin-basic-ssl`.
- **[2026-08-14] Desbordamiento de Títulos en Modales**: En Flexbox de CSS, `truncate` requiere `min-w-0` en cada nivel de contenedor anidado.
- **[2026-08-15] Malla P2P Multi-Salto Bidireccional**: Al recibir un `STATUS_UPDATE` o `GOSSIP_BROADCAST`, el nodo intermediario debe retransmitir a sus otros `peerConnections` incrementando `hopCount`.
- **[2026-08-16] Paleta Táctica Anti-Pánico**: Toda la interfaz debe mantener consistencia estricta en Negro Puro (`#000000`) y Verde Esmeralda (`#10b981`) para transmitir calma psicológica y ahorrar batería OLED.

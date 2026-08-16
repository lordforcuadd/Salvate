# 🛡️ Sálvate — Sistema de Resiliencia Sísmica & Red de Emergencia Offline

> **Versión**: 1.0.0 (PWA de Grado Táctico para Emergencias y Desastres Naturales)  
> **Ámbito Principal**: Perú (Monitoreo IGP/CENSIS & Redes Comunitarias Multi-Salto)  
> **Filosofía**: Resiliencia 100% Offline-First • Privacidad Total • Cero Dependencia de Servidores Centrales

---

## 1. 📖 Resumen Ejecutivo y Misión del Proyecto

En situaciones de sismos mayores (terremotos 7.5+ en la costa peruana) o catástrofes naturales, la infraestructura eléctrica y las torres de telefonía móvil 4G/5G suelen colapsar en los primeros minutos por saturación de llamadas o corte del fluido eléctrico.

**Sálvate** es una **Progressive Web App (PWA)** diseñada para operar con resiliencia extrema en condiciones de cero conectividad:
- Permite a ciudadanos, familias y brigadistas reportar su estado de supervivencia en **1 solo toque**.
- Despliega una **red en malla P2P (Peer-to-Peer Mesh)** donde los mensajes de texto, audios de voz y estados de auxilio saltan de celular en celular utilizando los propios dispositivos de la comunidad como repetidores.
- Integra monitoreo sísmico oficial del **IGP / CENSIS**, bóveda médica con código **QR escaneable sin internet**, mapa de peligros comunitarios, silbato acústico de rescate (2500 Hz) y linterna Morse SOS.
- Su interfaz visual está optimizada en **Negro Táctico Puro (`#000000`)** para máximo ahorro de batería en pantallas OLED/AMOLED y acentuada en **Verde Esmeralda (`#10b981`)** para infundir calma, seguridad y orden psicológico durante crisis.

---

## 2. 🏛️ Arquitectura Técnica y Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CAPA DE PRESENTACIÓN                          │
│     Vue 3 (Composition API / <script setup>) + Tailwind CSS + Lucide    │
│            Estética Táctica Black OLED (#000000) & Emerald (#10b981)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    GESTIÓN DE ESTADO REACTIVO (PINIA)                    │
│   authStore  │  meshStore  │  seismicStore  │  medicalStore  │ hazardStore │
└──────┬─────────────────┬───────────────────┬───────────────────┬────────┘
       │                 │                   │                   │
┌──────▼──────┐   ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐
│ PERSISTENCIA│   │  RED MALLA  │     │ GEOLOC & MAP│     │ HARDWARE SOS│
│  IndexedDB  │   │   WebRTC    │     │   Leaflet   │     │  Web Audio  │
│    (idb)    │   │   PeerJS    │     │ Geolocation │     │ Torch Track │
│LocalStorage │   │BroadcastChan│     │  Haversine  │     │ MediaStream │
└─────────────┘   └─────────────┘     └─────────────┘     └─────────────┘
```

### 2.1. Tecnologías Base
- **Frontend Core**: [Vue 3](https://vuejs.org/) con `<script setup>`, Composition API y reactividad profunda (`ref`, `computed`, `watch`).
- **Build Tool & Bundler**: [Vite 6](https://vitejs.dev/) con `@vitejs/plugin-basic-ssl` para garantizar contexto seguro HTTPS en redes locales (`192.168.x.x`) y desbloquear la API de Geolocalización en navegadores móviles.
- **Motor de Estilos**: [Tailwind CSS 3](https://tailwindcss.com/) configurado con paleta táctica de alta densidad visual, sin elementos superfluos y soporte estricto para pantallas OLED.
- **Motor PWA**: `vite-plugin-pwa` con Workbox para precaching de todos los assets estáticos, fuentes tipográficas y librerías, garantizando carga instantánea sin conexión.
- **Cartografía Offline/Online**: [Leaflet 1.9.4](https://leafletjs.com/) con capas de marcadores dinámicos, renderizado en canvas y popups reactivos.
- **Iconografía**: [Lucide Vue Next](https://lucide.dev/).

---

## 3. 🧩 Módulos del Sistema y Protocolos de Resiliencia

### 1. 🆘 Módulo Mi Estado (StatusPing)
- **Reporte en 1 Toque**: Tres estados estandarizados:
  - 🟢 **Estoy a Salvo**: Sin lesiones, lugar seguro.
  - 🔵 **En Traslado**: Evacuando hacia zona segura o punto de encuentro.
  - 🔴 **Necesito Ayuda**: Herido, atrapado o en peligro inminente.
- **Geolocalización Híbrida**: Detección satelital GPS de alta precisión (`enableHighAccuracy: true`) con selector de respaldo instantáneo para los 12 departamentos principales del Perú.
- **Canales de Respaldo**: Botón de SMS con enlace Google Maps autogenerado y guía paso a paso para el uso de la **Línea Gratuita 119 del MTC (Perú)**.

### 2. 🌐 Protocolo de Red Malla P2P Multi-Salto (AsyncBroadcast & UserDirectory)
- **Conexión Directa**: Enlaces WebRTC DataChannel cifrados de punto a punto gestionados mediante `PeerJS`.
- **Protocolo Gossip / Store & Forward**: Si la Persona C le envía un mensaje a la Persona B, el celular de B lo almacena en su `IndexedDB` y lo retransmite en cadena hacia la Persona A (*Mula de Datos*).
- **Notas de Voz Ultraligeras**: Grabación de audio en formato WebM/Opus a 8 kbps, permitiendo transmitir mensajes de voz de rescate con un peso menor a 15 KB por archivo.
- **Canal Local Multi-Pestaña**: `BroadcastChannel` para sincronización instantánea inter-proceso en el mismo dispositivo.

### 3. 🌋 Radar Telúrico Nacional (SeismicRadar)
- **Datos Oficiales IGP / CENSIS**: Sincronización de eventos telúricos con fecha y hora oficial del Perú (UTC-5), epicentro departamental, profundidad y magnitud Richter/Momento.
- **Cálculo Geodésico Haversine**: Calcula en tiempo real la distancia en kilómetros y el rumbo cardinal exacto (N, NE, E, SE, S, SW, W, NW) desde la ubicación actual del usuario hasta el epicentro del sismo.
- **Filtros Temporales**: Visualización de sismos en ventanas de 24 horas, 7 días y 30 días, diferenciando Perú y fronteras de eventos globales (USGS).

### 4. 🏥 Bóveda Médica & QR de Rescate Offline (MedicalVault)
- **Fichas Familiares**: Almacenamiento local de grupo sanguíneo, factor RH, DNI, alergias a medicamentos (penicilina, AINES) y condiciones crónicas (asma, diabetes, insulina).
- **Código QR Médico Offline**: Generador SVG vectorial que codifica la ficha médica completa en un QR de alta densidad; cualquier socorrista puede escanearlo desde la pantalla sin requerir internet ni descargar apps adicionales.
- **Guía Táctica de Primeros Auxilios**: Instrucciones paso a paso para RCP (Reanimación Cardiopulmonar), Maniobra de Heimlich, quemaduras y control de hemorragias.
- **Checklist 72 Horas**: Mochila de emergencia familiar y plan de evacuación para mascotas.

### 5. 🗺️ Mapa de Peligros Comunitario (HazardMap)
- Reportes georreferenciados de derrumbes, fugas de gas, cables eléctricos caídos y vías bloqueadas.
- Clasificación de nivel de riesgo (Bajo, Medio, Alto) y sincronización P2P distribuida.

### 6. 🔦 Herramientas de Auxilio Acústico y Óptico (RescueTools)
- **Silbato Acústico 2500 Hz**: Frecuencia de máxima sensibilidad auditiva para el oído humano y brigadas caninas K9 generada mediante la `Web Audio API` (Oscilador sinusoidal con barrido *chirp* de 1500 Hz a 3500 Hz).
- **Linterna SOS Código Morse**: Utiliza la `MediaStream Track Torch API` para modular el flash de la cámara del celular en la secuencia internacional de socorro `... --- ...`. Cuenta con fallback de pantalla estroboscópica blanca.

---

## 4. 🗄️ Esquema de Almacenamiento Local (IndexedDB)

La base de datos local `salvate_db` (Versión 1) contiene los siguientes Object Stores:

| Object Store | Clave Primaria | Propósito |
| :--- | :--- | :--- |
| `app_settings` | `key` | Configuración del usuario, credenciales locales y estado de conectividad |
| `status_history` | `id` | Registro cronológico de pings de estado propios y de contactos |
| `broadcast_messages` | `id` | Mensajes de texto, notas de voz (Blobs) y metadatos de saltos P2P |
| `family_members` | `id` | Fichas médicas familiares y datos de grupos sanguíneos |
| `hazard_reports` | `id` | Reportes de peligros geográficos e incidentes en la vía pública |
| `backpack_checklist` | `id` | Estado de verificación de la mochila de emergencia |
| `peer_directory` | `id` | Directorio de celulares vinculados e historial de contacto |

---

## 5. 🚀 Despliegue y Ejecución

```bash
# Instalación de dependencias
npm install

# Iniciar servidor de desarrollo con HTTPS local (para probar GPS en móviles)
npm run dev -- --host --port 5173

# Compilación de producción (PWA optimizada)
npm run build

# Previsualizar compilación de producción
npm run preview
```

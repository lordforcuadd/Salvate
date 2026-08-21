import { defineStore } from 'pinia';
import { VAPID_PUBLIC_KEY, registerPushSubscription, urlBase64ToUint8Array, sendRemoteWebPush } from '../services/supabase';

let sharedAudioCtx = null;
let userHasInteracted = false;
let _listenersRegistered = false;

function unlockAudio() {
  userHasInteracted = true;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try { sharedAudioCtx = new AudioCtx(); } catch (e) {}
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
}

if (typeof window !== 'undefined' && !_listenersRegistered) {
  _listenersRegistered = true;
  ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { passive: true });
  });
}

export function closeSharedAudioContext() {
  if (sharedAudioCtx) {
    try { sharedAudioCtx.close(); } catch (e) {}
    sharedAudioCtx = null;
  }
}

function playAlertChirp(type = 'default') {
  try {
    if (!userHasInteracted) return; // Prevent browser autoplay policy warnings
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try { sharedAudioCtx = new AudioCtx(); } catch (e) {}
      }
    }
    if (!sharedAudioCtx) return;

    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
      return;
    }

    const ctx = sharedAudioCtx;
    const now = ctx.currentTime;

    if (type === 'seismic') {
      // 🌋 ALERTA SÍSMICA: Doble sirena pulsante de emergencia urgente
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18);
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.35);
      gain2.gain.setValueAtTime(0.32, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);
      return;
    }

    if (type === 'status') {
      // 📡 PING / ESTADO: Sonar Bell / Ping de radar táctico cristalino
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
      return;
    }

    if (type === 'hazard') {
      // ⚠️ PELIGRO: Acorde de advertencia táctico
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + (i * 0.05));
        gain.gain.setValueAtTime(0.18, now + (i * 0.05));
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + (i * 0.05));
        osc.stop(now + 0.35);
      });
      return;
    }

    // 💬 CHAT / MENSAJE / AUDIO: Doble timbre de cristal melódico moderno
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.16);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1567.98, now + 0.08);
    gain2.gain.setValueAtTime(0.24, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.36);
  } catch (e) {}
}

export const useNotificationStore = defineStore('notification', {
  state: () => {
    let savedIds = [];
    try {
      savedIds = JSON.parse(localStorage.getItem('salvate_notified_events') || '[]');
    } catch (e) {}
    return {
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
      unreadBroadcasts: 0,
      unreadSeismic: 0,
      unreadHazards: 0,
      soundEnabled: true,
      vibrationEnabled: true,
      notifiedEventIds: Array.isArray(savedIds) ? savedIds : []
    };
  },

  getters: {
    hasPermission: (state) => state.permission === 'granted',
    totalUnreadCount: (state) => state.unreadBroadcasts + state.unreadSeismic + state.unreadHazards,
    hasUnread: (state) => (state.unreadBroadcasts + state.unreadSeismic + state.unreadHazards) > 0
  },

  actions: {
    async requestPermission(userId = null) {
      if (typeof Notification === 'undefined') return 'unsupported';
      try {
        const result = await Notification.requestPermission();
        this.permission = result;
        if (result === 'granted') {
          await this.subscribeToWebPush(userId);
          // Register Periodic Background Sync if available on device (PWA background worker)
          if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            try {
              const reg = await navigator.serviceWorker.ready;
              if ('periodicSync' in reg) {
                await reg.periodicSync.register('check-seismic-alerts', {
                  minInterval: 15 * 60 * 1000 // 15 minutes
                });
              }
            } catch (e) {}
          }
        }
        return result;
      } catch (err) {
        return 'denied';
      }
    },

    async subscribeToWebPush(userId = null) {
      if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        return false;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        if (!reg || !reg.pushManager) return false;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey
          });
        }

        const effectiveUserId = userId || localStorage.getItem('salvate_current_user') ? JSON.parse(localStorage.getItem('salvate_current_user') || '{}').id : null;
        if (effectiveUserId && sub) {
          await registerPushSubscription(effectiveUserId, sub);
        }
        return true;
      } catch (err) {
        console.warn('Web Push Subscription notice:', err);
        return false;
      }
    },

    updateBadgesAndTitle() {
      const total = this.totalUnreadCount;

      // 1. App Icon Badge (W3C Badging API for Android PWA / Desktop)
      if (typeof navigator !== 'undefined') {
        if (total > 0 && 'setAppBadge' in navigator) {
          navigator.setAppBadge(total).catch(() => {});
        } else if (total === 0 && 'clearAppBadge' in navigator) {
          navigator.clearAppBadge().catch(() => {});
        }
      }

      // 2. Browser Tab Title Prefix
      if (typeof document !== 'undefined') {
        const baseTitle = 'Sálvate • Alerta Sísmica y Emergencias';
        document.title = total > 0 ? `(${total}) ${baseTitle}` : baseTitle;
      }
    },

    async notify({ type = 'broadcast', title, body, tag, id, tabToOpen = null }) {
      // Prevent duplicate notification for identical event ID or content
      const eventKey = id || tag || `${type}_${title}_${body}`;
      if (this.notifiedEventIds.includes(eventKey)) {
        return;
      }
      this.notifiedEventIds.push(eventKey);
      if (this.notifiedEventIds.length > 100) {
        this.notifiedEventIds.shift();
      }
      try {
        localStorage.setItem('salvate_notified_events', JSON.stringify(this.notifiedEventIds));
      } catch (e) {}

      // Increment badge counters
      if (type === 'broadcast') this.unreadBroadcasts++;
      else if (type === 'seismic') this.unreadSeismic++;
      else if (type === 'hazard') this.unreadHazards++;

      this.updateBadgesAndTitle();

      // Audio feedback (safe against autoplay policy)
      if (this.soundEnabled && userHasInteracted) {
        playAlertChirp(type);
      }

      // Physical vibration feedback on mobile (safe against browser intervention)
      if (userHasInteracted && this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          if (type === 'seismic') {
            navigator.vibrate([500, 200, 500, 200, 700]);
          } else if (type === 'status') {
            navigator.vibrate([200, 100, 200]);
          } else {
            navigator.vibrate([150, 80, 150]);
          }
        } catch (e) {}
      }

      const notifTag = tag || `salvate-${type}-${id || 'event'}`;

      // Native System Push / Web Notification:
      // Only fire native OS notification if the document is hidden/background (prevent spamming user while active in-app)
      const isDocumentHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';

      if (isDocumentHidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const options = {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: notifTag,
          vibrate: type === 'seismic' ? [500, 200, 500, 200, 700] : [200, 100, 200],
          data: { tab: tabToOpen || type, timestamp: Date.now() },
          requireInteraction: type === 'seismic' || type === 'status' || type === 'hazard',
          renotify: false
        };

        const triggerNative = async () => {
          try {
            if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              if (reg && reg.showNotification) {
                await reg.showNotification(title, options);
                return;
              }
            }
          } catch (e) {}
          try {
            new Notification(title, options);
          } catch (e) {}
        };

        triggerNative().catch(() => {});
      }

      // Broadcast to all remote phones via Web Push if seismic or hazard alert
      if (navigator.onLine && (type === 'seismic' || type === 'hazard')) {
        sendRemoteWebPush({
          title,
          body,
          type,
          tabToOpen: tabToOpen || type,
          tag: notifTag
        }).catch(() => {});
      }
    },

    clearUnread(tabName) {
      if (tabName === 'broadcast') this.unreadBroadcasts = 0;
      else if (tabName === 'seismic') this.unreadSeismic = 0;
      else if (tabName === 'hazards') this.unreadHazards = 0;
      else if (tabName === 'dashboard') {
        this.unreadBroadcasts = 0;
        this.unreadSeismic = 0;
        this.unreadHazards = 0;
      }
      this.updateBadgesAndTitle();
    },

    clearAllUnread() {
      this.unreadBroadcasts = 0;
      this.unreadSeismic = 0;
      this.unreadHazards = 0;
      this.updateBadgesAndTitle();
    }
  }
});

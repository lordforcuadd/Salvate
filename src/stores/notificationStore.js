import { defineStore } from 'pinia';

function playAlertChirp(type = 'default') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'seismic') {
      // Deeper double emergency alert tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
    } else {
      // High-pitch tactical chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
    }

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 400);
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
    async requestPermission() {
      if (typeof Notification === 'undefined') return 'unsupported';
      try {
        const result = await Notification.requestPermission();
        this.permission = result;
        return result;
      } catch (err) {
        return 'denied';
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
      // Prevent duplicate notification for identical event ID
      if (id && this.notifiedEventIds.includes(id)) {
        return;
      }
      if (id) {
        this.notifiedEventIds.push(id);
        if (this.notifiedEventIds.length > 50) {
          this.notifiedEventIds.shift();
        }
        try {
          localStorage.setItem('salvate_notified_events', JSON.stringify(this.notifiedEventIds));
        } catch (e) {}
      }

      // Increment badge counters
      if (type === 'broadcast') this.unreadBroadcasts++;
      else if (type === 'seismic') this.unreadSeismic++;
      else if (type === 'hazard') this.unreadHazards++;

      this.updateBadgesAndTitle();

      // Audio feedback
      if (this.soundEnabled) {
        playAlertChirp(type);
      }

      // Physical vibration feedback on mobile
      if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          if (type === 'seismic') {
            navigator.vibrate([200, 100, 200, 100, 300]);
          } else {
            navigator.vibrate([150, 80, 150]);
          }
        } catch (e) {}
      }

      // Native System Push / Web Notification
      if (this.hasPermission && typeof Notification !== 'undefined') {
        const options = {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: tag || `salvate-${type}-${Date.now()}`,
          vibrate: type === 'seismic' ? [200, 100, 200, 100, 300] : [150, 80, 150],
          data: { tab: tabToOpen || type, timestamp: Date.now() },
          renotify: true
        };

        try {
          if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.showNotification) {
              await reg.showNotification(title, options);
              return;
            }
          }
          new Notification(title, options);
        } catch (e) {}
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

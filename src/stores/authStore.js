import { defineStore } from 'pinia';
import { saveDBItem, clearDBStore, masterDeleteWholeDB } from '../services/db';
import { useMeshStore } from './meshStore';
import { useSeismicStore } from './seismicStore';
import { useNotificationStore } from './notificationStore';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    isAuthenticated: false,
    isOnline: navigator.onLine,
  }),

  getters: {
    userName: (state) => state.user?.name || '',
    userStatus: (state) => state.user?.status || 'A salvo',
    userId: (state) => state.user?.id || '',
    userCoords: (state) => state.user?.coords || null,
  },

  actions: {
    initAuth() {
      if (this._initialized) return;
      this._initialized = true;

      window.addEventListener('online', () => this.isOnline = true);
      window.addEventListener('offline', () => this.isOnline = false);

      window.addEventListener('storage', (e) => {
        if (e.key === 'salvate_current_user' && e.newValue) {
          try {
            this.user = JSON.parse(e.newValue);
            this.isAuthenticated = true;
          } catch (err) {}
        }
      });

      const savedUser = localStorage.getItem('salvate_current_user');
      if (savedUser) {
        try {
          this.user = JSON.parse(savedUser);
          this.isAuthenticated = true;
          saveDBItem('users', this.user);
          this.captureInitialLocation();
          try {
            const notifStore = useNotificationStore();
            notifStore.subscribeToWebPush(this.user.id);
          } catch (e) {}
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
    },

    async captureInitialLocation() {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
      if (this._locPromise) return this._locPromise;

      this._locPromise = new Promise((resolve) => {
        const onSuccess = (pos) => {
          const freshCoords = {
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
            accuracy: Math.round(pos.coords.accuracy || 0)
          };
          this.setUserCoords(freshCoords);
          try {
            const seismicStore = useSeismicStore();
            seismicStore.updateUserCoordsAndRecalculate(freshCoords);
          } catch (e) {}
          this._locPromise = null;
          resolve(freshCoords);
        };

        const tryLowAccuracy = () => {
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            () => {
              this._locPromise = null;
              resolve(null);
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        };

        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (err) => {
            if (err.code === 3) {
              // High accuracy timed out, fallback to low accuracy / wifi / cell tower triangulation immediately
              tryLowAccuracy();
            } else {
              this._locPromise = null;
              resolve(null);
            }
          },
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 10000 }
        );
      });

      return this._locPromise;
    },

    async loginWithName(name) {
      if (!name || !name.trim()) return false;
      const cleanName = name.trim();
      const hash = Math.random().toString(36).substring(2, 8);
      const id = `salvate-${cleanName.toLowerCase().replace(/\s+/g, '_')}-${hash}`;

      const newUser = {
        id,
        name: cleanName,
        status: 'A salvo',
        coords: null,
        updatedAt: new Date().toISOString(),
      };

      // Cleanly reset previous session's contacts in memory and DB so the new account starts fresh
      await clearDBStore('users');
      const meshStore = useMeshStore();
      meshStore.users = [newUser];

      this.user = newUser;
      this.isAuthenticated = true;

      localStorage.setItem('salvate_current_user', JSON.stringify(newUser));
      await saveDBItem('users', newUser);
      try {
        const notifStore = useNotificationStore();
        notifStore.subscribeToWebPush(newUser.id);
      } catch (e) {}
      return true;
    },

    updateUserStatus(status, coords = null) {
      if (!this.user) return;

      const nowIso = new Date().toISOString();
      this.user.status = status;
      if (coords) {
        this.user.coords = coords;
      }
      this.user.updatedAt = nowIso;

      localStorage.setItem('salvate_current_user', JSON.stringify(this.user));
      saveDBItem('users', this.user);

      const meshStore = useMeshStore();
      const existingIdx = meshStore.users.findIndex(u => u.id === this.user.id);
      if (existingIdx >= 0) {
        meshStore.users.splice(existingIdx, 1, { ...this.user });
      } else {
        meshStore.users.unshift({ ...this.user });
      }

      localStorage.setItem('salvate_users_update', Date.now().toString());
    },

    setUserCoords(coords) {
      if (!this.user) return;
      this.user.coords = coords;
      localStorage.setItem('salvate_current_user', JSON.stringify(this.user));
      saveDBItem('users', this.user);
      
      const meshStore = useMeshStore();
      const existingIdx = meshStore.users.findIndex(u => u.id === this.user.id);
      if (existingIdx >= 0) {
        meshStore.users.splice(existingIdx, 1, { ...this.user });
      }
      localStorage.setItem('salvate_users_update', Date.now().toString());
    },

    logout() {
      this.user = null;
      this.isAuthenticated = false;
      localStorage.removeItem('salvate_current_user');
      const meshStore = useMeshStore();
      meshStore.users = [];
      meshStore.broadcasts = [];
    },

    async resetAllData() {
      const meshStore = useMeshStore();
      
      // Notify remote P2P peers that this user account was deleted
      if (this.user) {
        const deletePayload = { type: 'USER_DELETED', userId: this.user.id };
        if (meshStore.broadcastChannel) {
          try { meshStore.broadcastChannel.postMessage(deletePayload); } catch (e) {}
        }
        meshStore.peerConnections.forEach(conn => {
          if (conn && conn.open) {
            try { conn.send(deletePayload); } catch (e) {}
          }
        });
      }

      this.user = null;
      this.isAuthenticated = false;
      localStorage.clear();
      sessionStorage.clear();
      await masterDeleteWholeDB();
      await clearDBStore('users');
      await clearDBStore('broadcast_messages');
      await clearDBStore('status_history');
      await clearDBStore('medical_vault');
      await clearDBStore('checklists');
      await clearDBStore('hazard_reports');
      window.location.reload();
    }
  }
});

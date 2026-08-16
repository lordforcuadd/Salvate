import { defineStore } from 'pinia';
import { Peer } from 'peerjs';
import { saveDBItem, getAllDBItems, deleteDBItem } from '../services/db';
import { useAuthStore } from './authStore';

export const useMeshStore = defineStore('mesh', {
  state: () => ({
    peerInstance: null,
    isP2PActive: false,
    activePeersCount: 0,
    peerConnections: [],
    users: [],
    broadcasts: [],
    pingHistory: [],
    notifications: [],
    broadcastChannel: null,
    isOnlineMode: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pollInterval: null,
    reconnectTimeout: null
  }),

  getters: {
    safeCount: (state) => state.users.filter(u => u.status === 'A salvo').length,
    inTransitCount: (state) => state.users.filter(u => u.status === 'En traslado').length,
    helpCount: (state) => state.users.filter(u => u.status === 'Requiere ayuda').length,
  },

  actions: {
    async initMesh(currentUser = null) {
      if (!this._listenersRegistered) {
        this._listenersRegistered = true;
        window.addEventListener('online', () => this.isOnlineMode = true);
        window.addEventListener('offline', () => this.isOnlineMode = false);

        window.addEventListener('storage', (e) => {
          if (e.key === 'salvate_broadcast_update' || e.key === 'salvate_users_update') {
            this.reloadFromDB();
          }
          if (e.key === 'salvate_live_gossip' && e.newValue) {
            try {
              const data = JSON.parse(e.newValue);
              this.handleIncomingGossip(data);
            } catch (err) {}
          }
        });
      }

      await this.reloadFromDB();

      if ('BroadcastChannel' in window && !this.broadcastChannel) {
        this.broadcastChannel = new BroadcastChannel('salvate_mesh_gossip');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingGossip(event.data);
        };
        this.isP2PActive = true;
      }

      if (!this.pollInterval) {
        this.pollInterval = setInterval(async () => {
          await this.reloadFromDB();
        }, 3000);
      }

      if (currentUser && currentUser.id) {
        this.setupWebRTCPeer(currentUser);
      }
    },

    broadcastGossipLocally(payload) {
      if (!payload) return;
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(payload);
        } catch (e) {}
      }
      // Note: We append _ts with Date.now() + Math.random() to guarantee that localStorage value changes on every call,
      // which is required by web browsers to reliably trigger the cross-tab 'storage' event across browser windows.
      try {
        localStorage.setItem('salvate_live_gossip', JSON.stringify({ ...payload, _ts: Date.now() + Math.random() }));
      } catch (e) {}
    },

    stopMesh() {
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
        this.pollInterval = null;
      }
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
      if (this.broadcastChannel) {
        try { this.broadcastChannel.close(); } catch (e) {}
        this.broadcastChannel = null;
      }
      if (this.peerInstance && !this.peerInstance.destroyed) {
        try { this.peerInstance.destroy(); } catch (e) {}
        this.peerInstance = null;
      }
      this.isP2PActive = false;
      this.activePeersCount = 0;
    },

    async reloadFromDB() {
      const dbUsers = await getAllDBItems('users');
      if (dbUsers) {
        this.users = dbUsers.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      }

      const dbBroadcasts = await getAllDBItems('broadcast_messages');
      if (dbBroadcasts) {
        this.broadcasts = dbBroadcasts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }

      const dbHistory = await getAllDBItems('status_history');
      if (dbHistory) {
        this.pingHistory = dbHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    },

    async removeUser(userId) {
      this.users = this.users.filter(u => u.id !== userId);
      await deleteDBItem('users', userId);
      localStorage.setItem('salvate_users_update', Date.now().toString());
    },

    async cleanupGhostUsers(currentUserId) {
      const now = Date.now();
      // Only delete contacts that are genuinely inactive (>3 minutes without updates)
      const ghostIds = this.users
        .filter(u => u.id !== currentUserId && (now - new Date(u.updatedAt || 0).getTime() > 180000))
        .map(u => u.id);

      const removedCount = ghostIds.length;

      this.users = this.users.filter(u => !ghostIds.includes(u.id));
      for (const id of ghostIds) {
        await deleteDBItem('users', id);
      }

      localStorage.setItem('salvate_users_update', Date.now().toString());

      this.pushNotification({
        type: 'status',
        title: 'Directorio Limpio',
        message: removedCount > 0 ? `Se han limpiado ${removedCount} contactos inactivos.` : 'No hay contactos inactivos que limpiar.'
      });
    },

    setupWebRTCPeer(currentUser) {
      try {
        const cleanPeerId = currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        if (this.peerInstance && !this.peerInstance.destroyed) {
          try { this.peerInstance.destroy(); } catch (e) {}
        }

        this.peerInstance = new Peer(cleanPeerId, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          pingInterval: 10000,
          debug: 0,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:stun3.l.google.com:19302' },
              { urls: 'stun:stun4.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peerInstance.on('open', (id) => {
          this.isP2PActive = true;
          this.announceSelfToKnownPeers(currentUser);
        });

        this.peerInstance.on('disconnected', () => {
          if (this.peerInstance && !this.peerInstance.destroyed && navigator.onLine) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              try {
                if (this.peerInstance && this.peerInstance.disconnected && navigator.onLine) {
                  this.peerInstance.reconnect();
                }
              } catch (e) {}
            }, 10000);
          }
        });

        this.peerInstance.on('connection', (conn) => {
          this.registerDataConnection(conn, currentUser);
        });

        this.peerInstance.on('error', (err) => {
          if (err.type === 'peer-unavailable') return;
          if (err.type === 'network' || err.type === 'disconnected' || err.type === 'server-error' || err.type === 'socket-error') {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              if (this.peerInstance && !this.peerInstance.destroyed && this.peerInstance.disconnected && navigator.onLine) {
                try { this.peerInstance.reconnect(); } catch (e) {}
              }
            }, 15000);
          }
        });

      } catch (e) {
        console.warn('WebRTC fallback to local gossip:', e);
      }
    },

    announceSelfToKnownPeers(currentUser) {
      if (!this.peerInstance || this.peerInstance.destroyed) return;

      this.users.forEach(u => {
        if (u.id !== currentUser.id) {
          const cleanTargetId = u.id.replace(/[^a-zA-Z0-9_-]/g, '_');
          this.connectToPeer(cleanTargetId, currentUser);
        }
      });
    },

    connectToPeer(targetPeerId, currentUser) {
      if (!this.peerInstance || this.peerInstance.destroyed || !targetPeerId) return;
      try {
        const cleanTarget = targetPeerId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const conn = this.peerInstance.connect(cleanTarget, { reliable: true });
        conn.on('open', () => {
          this.registerDataConnection(conn, currentUser);
          if (conn.open && currentUser) {
            try {
              conn.send({
                type: 'STATUS_UPDATE',
                payload: currentUser
              });
              conn.send({
                type: 'REQUEST_STATUS'
              });
            } catch (e) {}
          }
        });
      } catch (e) {}
    },

    registerDataConnection(conn, currentUser = null) {
      if (this.peerConnections.some(c => c.peer === conn.peer)) return;
      this.peerConnections.push(conn);
      this.activePeersCount = this.peerConnections.length;

      const sendHandshake = () => {
        if (currentUser && conn.open) {
          try {
            conn.send({
              type: 'STATUS_UPDATE',
              payload: currentUser
            });
            conn.send({
              type: 'REQUEST_STATUS'
            });
          } catch (e) {}
        }
      };

      if (conn.open) {
        sendHandshake();
      } else {
        conn.on('open', () => {
          sendHandshake();
        });
      }

      conn.on('data', (data) => {
        this.handleIncomingGossip(data);
      });

      conn.on('close', () => {
        this.peerConnections = this.peerConnections.filter(c => c.peer !== conn.peer);
        this.activePeersCount = this.peerConnections.length;
      });
    },

    async linkDeviceBidirectional(targetPeerId, currentUser) {
      if (!targetPeerId || !currentUser) return;
      const cleanTargetId = targetPeerId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // 1. Establish WebRTC connection
      this.connectToPeer(cleanTargetId, currentUser);

      // 2. Derive placeholder name if not yet received
      const cleanPeerName = cleanTargetId.split('-')[1] ? cleanTargetId.split('-')[1].replace(/_/g, ' ') : 'Contacto Cercano';
      const peerPlaceholder = {
        id: cleanTargetId,
        name: cleanPeerName.charAt(0).toUpperCase() + cleanPeerName.slice(1),
        status: 'A salvo',
        updatedAt: new Date().toISOString()
      };

      await this.registerOrUpdatePeerUser(peerPlaceholder);

      // 3. Broadcast bidirectional link handshake via Local channels & all open WebRTC conns
      const linkPayload = {
        type: 'LINK_PEER',
        targetId: cleanTargetId,
        sender: currentUser
      };

      this.broadcastGossipLocally(linkPayload);

      this.peerConnections.forEach(conn => {
        if (conn && conn.open) {
          try { conn.send(linkPayload); } catch (e) {}
        }
      });
    },

    async registerOrUpdatePeerUser(peer) {
      const existingIdx = this.users.findIndex(u => u.id === peer.id);
      const existingUser = existingIdx >= 0 ? this.users[existingIdx] : null;

      const validStatus = (peer.status && peer.status !== 'Conectado P2P')
        ? peer.status
        : (existingUser?.status || 'A salvo');

      const updatedPeer = { 
        ...existingUser,
        ...peer, 
        status: validStatus,
        updatedAt: peer.updatedAt || new Date().toISOString() 
      };

      if (existingIdx >= 0) {
        this.users.splice(existingIdx, 1, updatedPeer);
      } else {
        this.users.unshift(updatedPeer);
      }

      await saveDBItem('users', updatedPeer);
      localStorage.setItem('salvate_users_update', Date.now().toString());
    },

    async sendStatusPingToMesh(userObj) {
      const nowIso = new Date().toISOString();
      const updatedUser = { ...userObj, updatedAt: nowIso };

      await this.registerOrUpdatePeerUser(updatedUser);

      const payload = {
        type: 'STATUS_UPDATE',
        payload: updatedUser,
        isPing: true
      };

      this.broadcastGossipLocally(payload);

      this.peerConnections.forEach(conn => {
        if (conn && conn.open) {
          try { conn.send(payload); } catch (e) {}
        }
      });

      this.announceSelfToKnownPeers(updatedUser);

      this.pushNotification({
        type: 'status',
        status: updatedUser.status,
        title: 'Reporte Registrado',
        message: `Tu estado "${updatedUser.status}" se ha guardado en la red.`
      });
    },

    async createBroadcast({ senderId, senderName, type, content, audioBlob = null, coords = null }) {
      let audioUrl = null;
      if (audioBlob) {
        audioUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(audioBlob);
        });
      }

      const broadcastMsg = {
        id: `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        senderId,
        senderName,
        type,
        content: content || (type === 'audio' ? 'Nota de voz de emergencia' : ''),
        audioUrl,
        coords,
        timestamp: new Date().toISOString(),
        synced: navigator.onLine,
        mode: navigator.onLine ? 'Nacional (Internet)' : 'Red P2P Malla (Offline)',
        hopCount: 1
      };

      this.broadcasts.unshift(broadcastMsg);
      await saveDBItem('broadcast_messages', broadcastMsg);

      localStorage.setItem('salvate_broadcast_update', Date.now().toString());

      const gossipPayload = {
        type: 'GOSSIP_BROADCAST',
        payload: broadcastMsg
      };

      this.broadcastGossipLocally(gossipPayload);

      this.peerConnections.forEach(conn => {
        if (conn && conn.open) {
          try {
            conn.send(gossipPayload);
          } catch (e) {}
        }
      });

      this.pushNotification({
        type: 'broadcast',
        title: 'Mensaje Transmitido',
        message: type === 'audio' ? 'Nota de voz enviada' : `"${content}"`
      });

      return broadcastMsg;
    },

    async handleIncomingGossip(data) {
      if (!data || !data.type) return;
      const authStore = useAuthStore();
      const currentUserId = authStore.userId;

      if (data.type === 'RESET_GHOST_PEERS') {
        this.users = [];
        this.broadcasts = [];
        this.pingHistory = [];
        await this.reloadFromDB();
        return;
      }

      if (data.type === 'USER_DELETED') {
        if (data.userId) {
          await this.removeUser(data.userId);
        }
        return;
      }

      if (data.type === 'LINK_PEER') {
        const sender = data.sender;
        if (sender && sender.id !== currentUserId) {
          await this.registerOrUpdatePeerUser(sender);
          this.connectToPeer(sender.id, authStore.user);

          if (authStore.user) {
            const replyPayload = {
              type: 'STATUS_UPDATE',
              payload: authStore.user,
              isPing: false
            };

            this.broadcastGossipLocally(replyPayload);

            this.peerConnections.forEach(conn => {
              if (conn && conn.open) {
                try { conn.send(replyPayload); } catch (e) {}
              }
            });
          }

          this.pushNotification({
            type: 'status',
            status: sender.status || 'A salvo',
            title: 'Contacto Vinculado',
            message: `${sender.name} se ha vinculado a tu red de emergencia.`
          });
        }
        return;
      }

      if (data.type === 'REQUEST_STATUS') {
        if (authStore.user) {
          const payload = {
            type: 'STATUS_UPDATE',
            payload: authStore.user,
            isPing: false
          };

          this.broadcastGossipLocally(payload);

          this.peerConnections.forEach(conn => {
            if (conn && conn.open) {
              try { conn.send(payload); } catch (e) {}
            }
          });
        }
        return;
      }

      if (data.type === 'STATUS_UPDATE') {
        const peer = data.payload;

        if (peer && peer.id !== currentUserId) {
          const existingUser = this.users.find(u => u.id === peer.id);
          const hasStatusChanged = existingUser && existingUser.status !== peer.status;
          const isExplicitPing = Boolean(data.isPing);

          await this.registerOrUpdatePeerUser(peer);

          // Only record to history & notify if status genuinely changed or was an explicit user ping (NOT on silent reload syncs)
          if (hasStatusChanged || isExplicitPing) {
            const historyEntry = {
              id: `ping-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              userId: peer.id,
              userName: peer.name,
              status: peer.status,
              coords: peer.coords,
              timestamp: peer.updatedAt || new Date().toISOString()
            };

            const exists = this.pingHistory.some(h => h.userId === peer.id && h.timestamp === historyEntry.timestamp);
            if (!exists) {
              this.pingHistory.unshift(historyEntry);
              await saveDBItem('status_history', historyEntry);
            }

            this.pushNotification({
              type: 'status',
              status: peer.status,
              title: `Estado: ${peer.name}`,
              message: `Reporta: "${peer.status}"`
            });

            // Forward emergency status update to other connected mesh nodes
            this.peerConnections.forEach(conn => {
              if (conn && conn.open && conn.peer !== peer.id) {
                try {
                  conn.send({
                    type: 'STATUS_UPDATE',
                    payload: peer,
                    isPing: false
                  });
                } catch (e) {}
              }
            });
          }
        }
        return;
      }

      if (data.type === 'GOSSIP_BROADCAST') {
        const msg = data.payload;

        const exists = this.broadcasts.some(b => b.id === msg.id);
        if (!exists) {
          msg.hopCount = (msg.hopCount || 1) + 1;
          this.broadcasts.unshift(msg);
          await saveDBItem('broadcast_messages', msg);
          
          localStorage.setItem('salvate_broadcast_update', Date.now().toString());

          if (msg.senderId !== currentUserId) {
            this.pushNotification({
              type: 'broadcast',
              title: `Mensaje de ${msg.senderName}`,
              message: msg.type === 'audio' ? 'Nota de voz recibida' : `"${msg.content}"`
            });
          }

          this.broadcastGossipLocally({
            type: 'GOSSIP_BROADCAST',
            payload: msg
          });

          this.peerConnections.forEach(conn => {
            if (conn && conn.open && conn.peer !== msg.senderId) {
              try {
                conn.send({
                  type: 'GOSSIP_BROADCAST',
                  payload: msg
                });
              } catch (e) {}
            }
          });
        }
      }
    },

    pushNotification({ type, status = '', title, message }) {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      let colorClass = 'bg-zinc-900 border-zinc-700 text-zinc-100';

      if (type === 'status') {
        if (status === 'A salvo') {
          colorClass = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100';
        } else if (status === 'En traslado') {
          colorClass = 'bg-teal-950/90 border-teal-500/50 text-teal-100';
        } else if (status === 'Requiere ayuda') {
          colorClass = 'bg-rose-950/90 border-rose-500/50 text-rose-100';
        }
      } else if (type === 'broadcast') {
        colorClass = 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100';
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      this.notifications.unshift({
        id,
        type,
        title,
        message,
        timestamp: timeStr,
        colorClass
      });

      if (this.notifications.length > 4) {
        this.notifications.pop();
      }

      setTimeout(() => {
        this.dismissNotification(id);
      }, 7000);
    },

    dismissNotification(id) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    }
  }
});

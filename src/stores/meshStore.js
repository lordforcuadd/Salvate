import { defineStore } from 'pinia';
import { Peer } from 'peerjs';
import { saveDBItem, getAllDBItems, deleteDBItem } from '../services/db';
import { useAuthStore } from './authStore';
import { useHazardStore } from './hazardStore';
import { useNotificationStore } from './notificationStore';
import { syncMessageToCloud, fetchRecentCloudMessages, syncPingToCloud, sendRemoteWebPush, initSupabaseRealtime } from '../services/supabase';

// Ultra-compact SDP Minifier (reduces 1500+ byte WebRTC SDP down to ~150 bytes for ultra-fast QR scanning)
function minifySDP(sdp, uid, name, type) {
  const ufragMatch = sdp.match(/a=ice-ufrag:([^\r\n]+)/);
  const pwdMatch = sdp.match(/a=ice-pwd:([^\r\n]+)/);
  const fpMatch = sdp.match(/a=fingerprint:sha-256 ([^\r\n]+)/);
  const setupMatch = sdp.match(/a=setup:([^\r\n]+)/);

  const candidates = [];
  const candidateRegex = /a=candidate:(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+typ\s+(\S+)/g;
  let match;
  while ((match = candidateRegex.exec(sdp)) !== null) {
    candidates.push([match[5], parseInt(match[6], 10), match[1], parseInt(match[4], 10), match[7]]);
  }

  return {
    t: type === 'offer' ? 'O' : 'A',
    uid,
    n: name,
    uf: ufragMatch ? ufragMatch[1] : '',
    pw: pwdMatch ? pwdMatch[1] : '',
    fp: fpMatch ? fpMatch[1].replace(/:/g, '') : '',
    st: setupMatch ? setupMatch[1] : (type === 'offer' ? 'actpass' : 'active'),
    cd: candidates
  };
}

function expandSDP(min) {
  if (min.sdp) {
    return {
      type: min.t === 'O' || min.t === 'SALVATE_OFFER' ? 'offer' : 'answer',
      sdp: min.sdp,
      uid: min.uid,
      name: min.name || min.n
    };
  }

  const type = min.t === 'O' ? 'offer' : 'answer';
  const setup = min.st || (type === 'offer' ? 'actpass' : 'active');
  const fpFormatted = (min.fp || '').match(/.{2}/g)?.join(':') || '';
  
  let sdp = [
    'v=0',
    `o=- ${Date.now()} 2 IN IP4 127.0.0.1`,
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
    'a=mid:0',
    `a=setup:${setup}`,
    'a=sctp-port:5000',
    `a=ice-ufrag:${min.uf}`,
    `a=ice-pwd:${min.pw}`,
    `a=fingerprint:sha-256 ${fpFormatted}`
  ].join('\r\n') + '\r\n';

  if (min.cd && Array.isArray(min.cd)) {
    min.cd.forEach((c, idx) => {
      sdp += `a=candidate:${c[2] || (idx + 1)} 1 UDP ${c[3] || 2122260223} ${c[0]} ${c[1]} typ ${c[4] || 'host'}\r\n`;
    });
  }

  return { type, sdp, uid: min.uid, name: min.n };
}

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
    reconnectTimeout: null,
    // Configurable Local Signaling (Community shelter / router / Raspberry Pi mode)
    signalingServer: JSON.parse(
      (typeof localStorage !== 'undefined' && localStorage.getItem('salvate_signaling_server')) ||
      '{"isCustom":false,"host":"0.peerjs.com","port":443,"path":"/","secure":true}'
    ),
    // Transient pending negotiation handle (isolated from established mesh peerConnections)
    pendingNegotiationPC: null,
    processedMessageIds: new Set()
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
        window.addEventListener('online', () => {
          this.isOnlineMode = true;
          const authStore = useAuthStore();
          if (authStore.user) {
            if (this.peerInstance && !this.peerInstance.destroyed && this.peerInstance.disconnected) {
              try { this.peerInstance.reconnect(); } catch (e) {}
            } else {
              this.setupWebRTCPeer(authStore.user);
            }
            this.announceSelfToKnownPeers(authStore.user);
          }
          fetchRecentCloudMessages(50).then(cloudMsgs => {
            if (cloudMsgs && cloudMsgs.length > 0) {
              let hasNew = false;
              cloudMsgs.forEach(msg => {
                const exists = this.broadcasts.some(b => b.id === msg.id);
                if (!exists) {
                  this.broadcasts.push(msg);
                  saveDBItem('broadcast_messages', msg).catch(() => {});
                  hasNew = true;
                }
              });
              if (hasNew) {
                localStorage.setItem('salvate_broadcast_update', Date.now().toString());
              }
            }
          }).catch(() => {});
          this.processOutboxQueue();
        });
        window.addEventListener('offline', () => {
          this.isOnlineMode = false;
        });

        window.addEventListener('storage', (e) => {
          if (e.key === 'salvate_broadcast_update' || e.key === 'salvate_users_update') {
            this.reloadFromDB();
          }
          if (e.key === 'salvate_hazards_update') {
            const hazardStore = useHazardStore();
            hazardStore.initHazardStore();
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

      if (navigator.onLine) {
        fetchRecentCloudMessages(50).then(cloudMsgs => {
          if (cloudMsgs && cloudMsgs.length > 0) {
            let hasNew = false;
            cloudMsgs.forEach(msg => {
              const exists = this.broadcasts.some(b => b.id === msg.id);
              if (!exists) {
                this.broadcasts.push(msg);
                saveDBItem('broadcast_messages', msg).catch(() => {});
                hasNew = true;
              }
            });
            if (hasNew) {
              localStorage.setItem('salvate_broadcast_update', Date.now().toString());
            }
          }
        }).catch(() => {});
      }

      if ('BroadcastChannel' in window && !this.broadcastChannel) {
        this.broadcastChannel = new BroadcastChannel('salvate_mesh_gossip');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingGossip(event.data);
        };
        this.isP2PActive = true;
      }

      // Initialize Supabase Realtime WebSocket for instantaneous cloud message delivery
      initSupabaseRealtime({
        onMessage: (msg) => {
          if (!msg || !msg.id) return;
          const authStore = useAuthStore();
          const currentUserId = authStore.userId;

          if (this.processedMessageIds.has(msg.id)) return;
          this.processedMessageIds.add(msg.id);

          const isExisting = this.users.some(u => u.id === msg.senderId);
          if (msg.senderId && msg.senderId !== currentUserId && (isExisting || msg.recipientId === currentUserId)) {
            this.registerOrUpdatePeerUser({
              id: msg.senderId,
              name: msg.senderName,
              coords: msg.coords,
              updatedAt: msg.timestamp
            });
          }

          const exists = this.broadcasts.some(b => b.id === msg.id);
          if (!exists) {
            this.broadcasts.unshift(msg);
            saveDBItem('broadcast_messages', msg).catch(() => {});
            localStorage.setItem('salvate_broadcast_update', Date.now().toString());

            const isForMe = !msg.recipientId || msg.recipientId === currentUserId;
            const isDirectMessage = Boolean(msg.recipientId);

            if (msg.senderId !== currentUserId && isForMe) {
              this.pushNotification({
                type: 'broadcast',
                title: isDirectMessage ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
                message: msg.type === 'audio' ? 'Nota de voz recibida' : `"${msg.content}"`
              });
              const notifStore = useNotificationStore();
              notifStore.notify({
                type: 'broadcast',
                title: isDirectMessage ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
                body: msg.type === 'audio' ? 'Nota de voz de emergencia recibida' : (msg.content || 'Nuevo mensaje comunitario'),
                id: msg.id,
                tabToOpen: 'broadcast'
              });
            }
          }
        },
        onPing: (ping) => {
          if (!ping || !ping.userId) return;
          const authStore = useAuthStore();
          if (ping.userId !== authStore.userId) {
            const pingKey = `ping_${ping.userId}_${ping.timestamp || ping.id || ''}`;
            if (this.processedMessageIds.has(pingKey)) return;
            this.processedMessageIds.add(pingKey);

            this.registerOrUpdatePeerUser({
              id: ping.userId,
              name: ping.userName,
              status: ping.status,
              coords: ping.coords,
              updatedAt: ping.timestamp
            });
            if (ping.isPing) {
              const notifStore = useNotificationStore();
              notifStore.notify({
                type: 'status',
                title: `Ping de ${ping.userName}`,
                body: `${ping.userName} reportó: "${ping.status || 'A salvo'}"`,
                id: pingKey,
                tabToOpen: 'status'
              });
            }
          }
        }
      });

      if (!this.pollInterval) {
        this.pollInterval = setInterval(async () => {
          // Prune closed / dead connections
          this.peerConnections = this.peerConnections.filter(c => c && c.open !== false);
          this.activePeersCount = this.peerConnections.length;

          await this.reloadFromDB();

          // Auto-recover PeerJS instance and reconnect with known contacts
          const authStore = useAuthStore();
          if (authStore.user && (navigator.onLine || this.signalingServer?.isCustom)) {
            if (!this.peerInstance || this.peerInstance.destroyed) {
              if (!this._isInitializingPeer && !this.reconnectTimeout) {
                this.setupWebRTCPeer(authStore.user);
              }
            } else if (!this.peerInstance.disconnected) {
              this.users.forEach(u => {
                if (u.id !== authStore.user.id) {
                  const cleanTargetId = u.id.replace(/[^a-zA-Z0-9_-]/g, '_');
                  const isAlreadyConnected = this.peerConnections.some(c => c.peer === cleanTargetId && c.open);
                  if (!isAlreadyConnected) {
                    this.connectToPeer(cleanTargetId, authStore.user);
                  }
                }
              });
            }
          }

          // Continuous background cloud sync when online (catches any missed real-time packets)
          if (navigator.onLine) {
            fetchRecentCloudMessages(30).then(cloudMsgs => {
              if (cloudMsgs && cloudMsgs.length > 0) {
                let hasNew = false;
                const currentUserId = authStore.userId;
                cloudMsgs.forEach(msg => {
                  if (this.processedMessageIds.has(msg.id)) return;
                  this.processedMessageIds.add(msg.id);

                  const exists = this.broadcasts.some(b => b.id === msg.id);
                  if (!exists) {
                    this.broadcasts.unshift(msg);
                    saveDBItem('broadcast_messages', msg).catch(() => {});
                    hasNew = true;
                    if (msg.senderId !== currentUserId && (!msg.recipientId || msg.recipientId === currentUserId)) {
                      const notifStore = useNotificationStore();
                      notifStore.notify({
                        type: 'broadcast',
                        title: msg.recipientId ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
                        body: msg.type === 'audio' ? 'Nota de voz recibida' : msg.content,
                        id: msg.id,
                        tabToOpen: 'broadcast'
                      });
                    }
                  }
                });
                if (hasNew) {
                  localStorage.setItem('salvate_broadcast_update', Date.now().toString());
                }
              }
            }).catch(() => {});
          }

          // Proactively drain pending outbox if any open connection or online
          const hasPending = (this.broadcasts || []).some(b => b.status === 'pending');
          if (hasPending && (this.peerConnections.some(c => c && c.open) || navigator.onLine)) {
            this.processOutboxQueue();
          }
        }, 2000);
      }

      if (typeof document !== 'undefined' && !this._resumeListenersAttached) {
        this._resumeListenersAttached = true;
        const handleAppResume = () => {
          this.reloadFromDB();
          const authStore = useAuthStore();
          if (authStore.user) {
            if (!this.peerInstance || this.peerInstance.destroyed || this.peerInstance.disconnected) {
              this.setupWebRTCPeer(authStore.user);
            } else {
              this.announceSelfToKnownPeers(authStore.user);
            }
          }
        };

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            handleAppResume();
          }
        });
        window.addEventListener('focus', handleAppResume);
        window.addEventListener('pageshow', handleAppResume);
      }

      if (currentUser && currentUser.id) {
        this.setupWebRTCPeer(currentUser);
      }
    },

    broadcastGossipLocally(payload) {
      if (!payload) return;
      const msgId = payload._msgId || `g_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const packet = { ...payload, _msgId: msgId, _ts: Date.now() };

      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage(packet);
        } catch (e) {}
      }
      try {
        localStorage.setItem('salvate_live_gossip', JSON.stringify(packet));
      } catch (e) {}
    },

    cancelPendingManualPairings() {
      if (this.pendingNegotiationPC) {
        // Only close if it was NOT successfully moved to established peerConnections
        const isEstablished = this.peerConnections.some(c => c._rawPC === this.pendingNegotiationPC && c.open);
        if (!isEstablished) {
          try { this.pendingNegotiationPC.close(); } catch (e) {}
        }
        this.pendingNegotiationPC = null;
      }
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
      this.cancelPendingManualPairings();
      this.peerConnections.forEach(conn => {
        if (conn && conn.close) {
          try { conn.close(); } catch (e) {}
        }
      });
      this.peerConnections = [];
      this.isP2PActive = false;
      this.activePeersCount = 0;
    },

    async reloadFromDB() {
      const dbUsers = await getAllDBItems('users');
      if (dbUsers) {
        const userMap = new Map();
        (this.users || []).forEach(u => userMap.set(u.id, u));
        dbUsers.forEach(u => userMap.set(u.id, { ...userMap.get(u.id), ...u }));
        this.users = Array.from(userMap.values()).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      }

      const dbBroadcasts = await getAllDBItems('broadcast_messages');
      if (dbBroadcasts) {
        const msgMap = new Map();
        (this.broadcasts || []).forEach(b => msgMap.set(b.id, b));
        dbBroadcasts.forEach(b => msgMap.set(b.id, { ...msgMap.get(b.id), ...b }));
        this.broadcasts = Array.from(msgMap.values()).sort((a, b) => {
          const tA = new Date(a.timestamp || 0).getTime();
          const tB = new Date(b.timestamp || 0).getTime();
          if (tB !== tA) return tB - tA;
          const sA = a.seq || 0;
          const sB = b.seq || 0;
          if (sB !== sA) return sB - sA;
          return String(b.id).localeCompare(String(a.id));
        });
      }

      const dbHistory = await getAllDBItems('status_history');
      if (dbHistory) {
        const histMap = new Map();
        (this.pingHistory || []).forEach(h => histMap.set(h.id, h));
        dbHistory.forEach(h => histMap.set(h.id, { ...histMap.get(h.id), ...h }));
        this.pingHistory = Array.from(histMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
    },

    async removeUser(userId) {
      this.users = this.users.filter(u => u.id !== userId);
      await deleteDBItem('users', userId);
      localStorage.setItem('salvate_users_update', Date.now().toString());
    },

    async cleanupGhostUsers(currentUserId) {
      const now = Date.now();
      const ghostIds = this.users
        .filter(u => u.id !== currentUserId && (now - new Date(u.updatedAt || 0).getTime() > 180000))
        .map(u => u.id);

      const removedCount = ghostIds.length;

      this.users = this.users.filter(u => !ghostIds.includes(u.id));
      for (const id of ghostIds) {
        await deleteDBItem('users', id);
      }

      localStorage.setItem('salvate_users_update', Date.now().toString());
    },

    updateSignalingServer(config, currentUser = null) {
      this.signalingServer = { ...config };
      localStorage.setItem('salvate_signaling_server', JSON.stringify(this.signalingServer));
      if (currentUser) {
        this.setupWebRTCPeer(currentUser);
      }
    },

    async setupWebRTCPeer(currentUser) {
      if (!currentUser || !currentUser.id) return;
      if (this._isInitializingPeer) return;

      const cleanPeerId = currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '_');

      // If already connected with active peer ID, do not tear down
      if (this.peerInstance && !this.peerInstance.destroyed && !this.peerInstance.disconnected && this.peerInstance.id === cleanPeerId) {
        return;
      }

      this._isInitializingPeer = true;

      try {
        if (this.peerInstance && !this.peerInstance.destroyed) {
          try {
            this.peerInstance.removeAllListeners();
            this.peerInstance.destroy();
          } catch (e) {}
          this.peerInstance = null;
        }

        const isCustom = this.signalingServer?.isCustom;
        const host = isCustom ? this.signalingServer.host : '0.peerjs.com';
        const port = isCustom ? Number(this.signalingServer.port) : 443;
        const path = isCustom ? (this.signalingServer.path || '/') : '/';
        const secure = isCustom ? Boolean(this.signalingServer.secure) : true;

        const peer = new Peer(cleanPeerId, {
          host,
          port,
          path,
          secure,
          pingInterval: 10000,
          debug: 0,
          config: isCustom ? { iceServers: [] } : {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peerInstance = peer;

        peer.on('open', (id) => {
          this._isInitializingPeer = false;
          this.isP2PActive = true;
          this.announceSelfToKnownPeers(currentUser);
          this.processOutboxQueue();
        });

        peer.on('disconnected', () => {
          this._isInitializingPeer = false;
          this.isP2PActive = this.peerConnections.some(c => c && c.open);

          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = setTimeout(() => {
            const authStore = useAuthStore();
            if (authStore.user && (navigator.onLine || this.signalingServer?.isCustom)) {
              this.setupWebRTCPeer(currentUser);
            }
          }, 5000);
        });

        peer.on('connection', (conn) => {
          this.registerDataConnection(conn, currentUser);
        });

        peer.on('error', (err) => {
          this._isInitializingPeer = false;
          if (err.type === 'peer-unavailable') return;
          this.isP2PActive = this.peerConnections.some(c => c && c.open);

          if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
          const delay = err.type === 'unavailable-id' ? 10000 : 5000;
          this.reconnectTimeout = setTimeout(() => {
            const authStore = useAuthStore();
            if (authStore.user && (navigator.onLine || this.signalingServer?.isCustom)) {
              this.setupWebRTCPeer(currentUser);
            }
          }, delay);
        });

      } catch (e) {
        this._isInitializingPeer = false;
        this.isP2PActive = this.peerConnections.some(c => c && c.open);
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
      if (this.peerInstance.disconnected) {
        this.setupWebRTCPeer(currentUser);
        return;
      }
      try {
        const cleanTarget = targetPeerId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const openConn = this.peerConnections.find(c => c.peer === cleanTarget && c.open);
        if (openConn) return;

        const conn = this.peerInstance.connect(cleanTarget, { reliable: true });
        if (!conn) return;

        conn.on('open', () => {
          this.registerDataConnection(conn, currentUser);
        });
        conn.on('error', () => {
          this.peerConnections = this.peerConnections.filter(c => c.peer !== cleanTarget);
          this.activePeersCount = this.peerConnections.length;
        });
      } catch (e) {}
    },

    registerDataConnection(conn, currentUser = null) {
      if (!conn || !conn.peer) return;

      const existingIdx = this.peerConnections.findIndex(c => c.peer === conn.peer);
      if (existingIdx >= 0) {
        const oldConn = this.peerConnections[existingIdx];
        if (oldConn !== conn) {
          try { oldConn.close(); } catch (e) {}
          this.peerConnections.splice(existingIdx, 1);
        }
      }

      this.peerConnections.push(conn);
      this.activePeersCount = this.peerConnections.length;

      const sendHandshake = () => {
        if (currentUser && conn.open) {
          try {
            conn.send({
              type: 'STATUS_UPDATE',
              payload: currentUser,
              isPing: false
            });
            conn.send({
              type: 'REQUEST_STATUS'
            });
            conn.send({
              type: 'SYNC_REQUEST'
            });
            if (this.broadcasts && this.broadcasts.length > 0) {
              conn.send({
                type: 'SYNC_BROADCASTS',
                payload: this.broadcasts.slice(0, 30)
              });
            }
            const hazardStore = useHazardStore();
            if (hazardStore.hazards && hazardStore.hazards.length > 0) {
              conn.send({
                type: 'SYNC_HAZARDS',
                payload: hazardStore.hazards.slice(0, 20)
              });
            }
            this.processOutboxQueue();
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
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          this.handleIncomingGossip(parsed);
        } catch (e) {
          this.handleIncomingGossip(data);
        }
      });

      const handleCloseOrError = () => {
        this.peerConnections = this.peerConnections.filter(c => c !== conn && c.peer !== conn.peer);
        this.activePeersCount = this.peerConnections.length;
      };

      conn.on('close', handleCloseOrError);
      conn.on('error', handleCloseOrError);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 🌐 EMPAREJAMIENTO DIRECTO MANUAL VÍA CÓDIGO QR (OFFLINE PURO 100% SIN SERVIDOR)
    // ─────────────────────────────────────────────────────────────────────────
    async createOfflineManualOffer(currentUser) {
      try {
        // Clean up only previous unestablished negotiations
        this.cancelPendingManualPairings();

        const pc = new RTCPeerConnection({ iceServers: [] });
        this.pendingNegotiationPC = pc;

        const dc = pc.createDataChannel('salvate_offline_mesh', { ordered: true });

        dc.onopen = () => {
          this.bindManualDataChannel(dc, pc, currentUser);
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          } else {
            const check = () => {
              if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', check);
                resolve();
              }
            };
            pc.addEventListener('icegatheringstatechange', check);
            setTimeout(resolve, 800);
          }
        });

        const minifiedOffer = minifySDP(pc.localDescription.sdp, currentUser.id, currentUser.name, 'offer');
        return JSON.stringify(minifiedOffer);
      } catch (err) {
        console.error('Error creating offline manual offer:', err);
        throw err;
      }
    },

    async createOfflineManualAnswer(offerTokenStr, currentUser) {
      try {
        this.cancelPendingManualPairings();

        let offerObj = null;
        try {
          offerObj = typeof offerTokenStr === 'object' ? offerTokenStr : JSON.parse(offerTokenStr.trim());
        } catch (e) {
          throw new Error('Formato de código inválido.');
        }

        const offerInfo = expandSDP(offerObj);
        const pc = new RTCPeerConnection({ iceServers: [] });
        this.pendingNegotiationPC = pc;

        pc.ondatachannel = (e) => {
          this.bindManualDataChannel(e.channel, pc, currentUser, offerInfo.uid, offerInfo.name);
        };

        await pc.setRemoteDescription(new RTCSessionDescription({
          type: 'offer',
          sdp: offerInfo.sdp
        }));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await new Promise((resolve) => {
          if (pc.iceGatheringState === 'complete') {
            resolve();
          } else {
            const check = () => {
              if (pc.iceGatheringState === 'complete') {
                pc.removeEventListener('icegatheringstatechange', check);
                resolve();
              }
            };
            pc.addEventListener('icegatheringstatechange', check);
            setTimeout(resolve, 800);
          }
        });

        const minifiedAnswer = minifySDP(pc.localDescription.sdp, currentUser.id, currentUser.name, 'answer');
        return JSON.stringify(minifiedAnswer);
      } catch (err) {
        console.error('Error creating offline manual answer:', err);
        throw err;
      }
    },

    async applyOfflineManualAnswer(answerTokenStr) {
      try {
        if (!this.pendingNegotiationPC) {
          throw new Error('No hay una oferta activa creada en este dispositivo.');
        }

        let answerObj = null;
        try {
          answerObj = typeof answerTokenStr === 'object' ? answerTokenStr : JSON.parse(answerTokenStr.trim());
        } catch (e) {
          throw new Error('Formato de respuesta inválido.');
        }

        const answerInfo = expandSDP(answerObj);
        await this.pendingNegotiationPC.setRemoteDescription(new RTCSessionDescription({
          type: 'answer',
          sdp: answerInfo.sdp
        }));

        return {
          success: true,
          remotePeerId: answerInfo.uid,
          remotePeerName: answerInfo.name
        };
      } catch (err) {
        console.error('Error applying offline manual answer:', err);
        throw err;
      }
    },

    bindManualDataChannel(channel, pc, currentUser, remotePeerId = null, remotePeerName = null) {
      const cleanPeerId = (remotePeerId || 'offline_peer_' + Math.random().toString(36).substr(2, 6)).replace(/[^a-zA-Z0-9_-]/g, '_');

      const wrappedConn = {
        peer: cleanPeerId,
        _rawPC: pc,
        _rawChannel: channel,
        open: channel.readyState === 'open',
        isOfflineDirect: true,
        send: (payload) => {
          if (channel.readyState === 'open') {
            try {
              channel.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
            } catch (e) {}
          }
        },
        close: () => {
          try { channel.close(); } catch (e) {}
          try { pc.close(); } catch (e) {}
        }
      };

      const handleOpen = () => {
        wrappedConn.open = true;

        // Decouple from pending slot so future negotiations won't close this established peer!
        if (this.pendingNegotiationPC === pc) {
          this.pendingNegotiationPC = null;
        }

        const existingIdx = this.peerConnections.findIndex(c => c.peer === cleanPeerId);
        if (existingIdx >= 0) {
          const oldConn = this.peerConnections[existingIdx];
          if (oldConn !== wrappedConn) {
            try { oldConn.close(); } catch (e) {}
            this.peerConnections.splice(existingIdx, 1);
          }
        }

        this.peerConnections.push(wrappedConn);
        this.activePeersCount = this.peerConnections.length;
        this.isP2PActive = true;

        if (currentUser) {
          try {
            wrappedConn.send({
              type: 'STATUS_UPDATE',
              payload: currentUser,
              isPing: false
            });
            wrappedConn.send({
              type: 'REQUEST_STATUS'
            });
            wrappedConn.send({
              type: 'SYNC_REQUEST'
            });
            if (this.broadcasts && this.broadcasts.length > 0) {
              wrappedConn.send({
                type: 'SYNC_BROADCASTS',
                payload: this.broadcasts.slice(0, 30)
              });
            }
          } catch (e) {}
        }

        if (remotePeerName) {
          this.registerOrUpdatePeerUser({
            id: cleanPeerId,
            name: remotePeerName,
            status: 'A salvo',
            updatedAt: new Date().toISOString()
          });
        }
      };

      channel.onopen = handleOpen;

      channel.onmessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          this.handleIncomingGossip(data);
        } catch (e) {}
      };

      channel.onclose = () => {
        wrappedConn.open = false;
        this.peerConnections = this.peerConnections.filter(c => c.peer !== cleanPeerId);
        this.activePeersCount = this.peerConnections.length;
      };

      if (channel.readyState === 'open') {
        handleOpen();
      }
    },

    async linkDeviceBidirectional(targetPeerId, currentUser) {
      if (!targetPeerId || !currentUser) return;
      const cleanTargetId = targetPeerId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      
      this.connectToPeer(cleanTargetId, currentUser);

      const cleanPeerName = cleanTargetId.split('-')[1] ? cleanTargetId.split('-')[1].replace(/_/g, ' ') : 'Contacto Cercano';
      const peerPlaceholder = {
        id: cleanTargetId,
        name: cleanPeerName.charAt(0).toUpperCase() + cleanPeerName.slice(1),
        status: 'A salvo',
        updatedAt: new Date().toISOString()
      };

      await this.registerOrUpdatePeerUser(peerPlaceholder);

      const linkPayload = {
        _msgId: `link_${cleanTargetId}_${Date.now()}`,
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

    async removeContact(userId) {
      if (!userId) return;
      this.users = this.users.filter(u => u.id !== userId);
      await deleteDBItem('users', userId);
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

      if (navigator.onLine) {
        syncPingToCloud(updatedUser).catch(() => {});
        sendRemoteWebPush({
          title: `Ping de ${updatedUser.name}`,
          body: `${updatedUser.name} reportó su estado: "${updatedUser.status}"`,
          type: 'status',
          tabToOpen: 'status',
          senderId: updatedUser.id,
          id: `ping_${updatedUser.id}`
        }).catch(() => {});
      }

      this.announceSelfToKnownPeers(updatedUser);
    },

    async processOutboxQueue() {
      const pendingMessages = (this.broadcasts || []).filter(b => b.status === 'pending');
      if (pendingMessages.length === 0) return;

      const hasActiveConn = this.peerConnections.some(c => c && c.open);
      const isOnline = navigator.onLine;

      if (!hasActiveConn && !isOnline) return;

      for (const msg of pendingMessages) {
        let delivered = false;

        const gossipPayload = {
          _msgId: `g_${msg.id}_${Date.now()}`,
          type: 'GOSSIP_BROADCAST',
          payload: msg
        };

        this.broadcastGossipLocally(gossipPayload);

        this.peerConnections.forEach(conn => {
          if (conn && conn.open) {
            try {
              conn.send(gossipPayload);
              delivered = true;
            } catch (e) {}
          }
        });

        if (isOnline) {
          const cloudOk = await syncMessageToCloud(msg);
          if (cloudOk) delivered = true;
          sendRemoteWebPush({
            title: msg.recipientId ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
            body: msg.type === 'audio' ? 'Nota de voz de emergencia recibida' : msg.content,
            type: 'broadcast',
            tabToOpen: 'broadcast',
            recipientId: msg.recipientId,
            senderId: msg.senderId,
            id: msg.id
          }).catch(() => {});
        }

        if (delivered || isOnline) {
          msg.status = 'sent';
          msg.synced = isOnline;
          await saveDBItem('broadcast_messages', msg);
        }
      }

      localStorage.setItem('salvate_broadcast_update', Date.now().toString());
    },

    async createBroadcast({ senderId, senderName, type = 'text', content = '', audioBlob = null, coords = null, recipientId = null, replyTo = null }) {
      let audioUrl = null;
      if (audioBlob) {
        audioUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(audioBlob);
        });
      }

      const hasActiveConn = this.peerConnections.some(c => c && c.open);
      const isOnline = navigator.onLine;

      const currentMaxSeq = (this.broadcasts || []).reduce((max, b) => Math.max(max, b.seq || 0), 0);
      this.maxSequence = Math.max(this.maxSequence || 0, currentMaxSeq) + 1;

      const broadcastMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        seq: this.maxSequence,
        senderId,
        senderName,
        recipientId: recipientId || null,
        type: type || 'text',
        content: content || (type === 'audio' ? 'Nota de voz de emergencia' : ''),
        audioUrl,
        coords,
        replyTo: replyTo ? {
          id: replyTo.id,
          senderName: replyTo.senderName,
          content: replyTo.content || (replyTo.type === 'audio' ? 'Nota de voz' : ''),
          type: replyTo.type
        } : null,
        reactions: {},
        status: (hasActiveConn || isOnline) ? 'sent' : 'pending',
        timestamp: new Date().toISOString(),
        synced: isOnline,
        mode: isOnline ? 'Nacional (Internet)' : 'Red P2P Malla (Offline)',
        hopCount: 1
      };

      this.broadcasts.unshift(broadcastMsg);
      await saveDBItem('broadcast_messages', broadcastMsg);

      localStorage.setItem('salvate_broadcast_update', Date.now().toString());

      const gossipPayload = {
        _msgId: `g_${broadcastMsg.id}_${Date.now()}`,
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

      if (isOnline) {
        syncMessageToCloud(broadcastMsg).catch(() => {});
        sendRemoteWebPush({
          title: broadcastMsg.recipientId ? `Mensaje Privado de ${broadcastMsg.senderName}` : `Mensaje de ${broadcastMsg.senderName}`,
          body: broadcastMsg.type === 'audio' ? 'Nota de voz de emergencia recibida' : broadcastMsg.content,
          type: 'broadcast',
          tabToOpen: 'broadcast',
          recipientId: broadcastMsg.recipientId,
          senderId: broadcastMsg.senderId,
          id: broadcastMsg.id
        }).catch(() => {});
      }

      return broadcastMsg;
    },

    async toggleMessageReaction(messageId, emoji) {
      const authStore = useAuthStore();
      const currentUserId = authStore.userId;
      if (!messageId || !emoji || !currentUserId) return;

      const targetMsg = this.broadcasts.find(b => b.id === messageId);
      if (targetMsg) {
        if (!targetMsg.reactions) targetMsg.reactions = {};
        if (!targetMsg.reactions[emoji]) targetMsg.reactions[emoji] = [];

        const existingIdx = targetMsg.reactions[emoji].indexOf(currentUserId);
        if (existingIdx >= 0) {
          targetMsg.reactions[emoji].splice(existingIdx, 1);
          if (targetMsg.reactions[emoji].length === 0) {
            delete targetMsg.reactions[emoji];
          }
        } else {
          // Remove user from other emoji reactions on this same message
          Object.keys(targetMsg.reactions).forEach(k => {
            targetMsg.reactions[k] = targetMsg.reactions[k].filter(id => id !== currentUserId);
            if (targetMsg.reactions[k].length === 0) delete targetMsg.reactions[k];
          });
          if (!targetMsg.reactions[emoji]) targetMsg.reactions[emoji] = [];
          targetMsg.reactions[emoji].push(currentUserId);
        }

        await saveDBItem('broadcast_messages', targetMsg);
        localStorage.setItem('salvate_broadcast_update', Date.now().toString());

        const reactionPayload = {
          _msgId: `react_${messageId}_${currentUserId}_${Date.now()}`,
          type: 'MESSAGE_REACTION',
          messageId,
          emoji,
          userId: currentUserId,
          userName: authStore.userName
        };

        this.broadcastGossipLocally(reactionPayload);
        this.peerConnections.forEach(conn => {
          if (conn && conn.open) {
            try { conn.send(reactionPayload); } catch (e) {}
          }
        });
      }
    },

    async markMessagesAsRead(peerUserId = null) {
      const authStore = useAuthStore();
      const currentUserId = authStore.userId;
      if (!currentUserId) return;

      let changed = false;
      const unreadMsgs = this.broadcasts.filter(b => 
        b.senderId !== currentUserId && 
        b.status !== 'read' &&
        (!peerUserId || b.senderId === peerUserId || b.recipientId === peerUserId)
      );

      for (const msg of unreadMsgs) {
        msg.status = 'read';
        changed = true;
        await saveDBItem('broadcast_messages', msg);

        const readAckPayload = {
          _msgId: `read_${msg.id}_${currentUserId}_${Date.now()}`,
          type: 'MESSAGE_ACK',
          messageId: msg.id,
          status: 'read',
          ackBy: currentUserId,
          ackByName: authStore.userName
        };

        this.broadcastGossipLocally(readAckPayload);
        this.peerConnections.forEach(conn => {
          if (conn && conn.open) {
            try { conn.send(readAckPayload); } catch (e) {}
          }
        });
      }

      if (changed) {
        localStorage.setItem('salvate_broadcast_update', Date.now().toString());
      }
    },

    async handleIncomingGossip(data) {
      if (!data || !data.type) return;

      // Global Packet Deduplication across BroadcastChannel, StorageEvent, and WebRTC
      const packetSignature = data._msgId || `${data.type}_${data.sender?.id || data.payload?.id || data.userId || ''}_${data.payload?.updatedAt || data.payload?.timestamp || data._ts || ''}`;
      
      if (!this._seenGossipSignatures) {
        this._seenGossipSignatures = new Set();
      }

      if (packetSignature && this._seenGossipSignatures.has(packetSignature)) {
        return; // Silently drop identical packet delivered by redundant transport
      }

      this._seenGossipSignatures.add(packetSignature);
      if (this._seenGossipSignatures.size > 200) {
        const [first] = this._seenGossipSignatures;
        this._seenGossipSignatures.delete(first);
      }

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
          const isBrandNew = !this.users.some(u => u.id === sender.id);
          await this.registerOrUpdatePeerUser(sender);
          this.connectToPeer(sender.id, authStore.user);

          const historyEntry = {
            id: `ping-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            userId: sender.id,
            userName: sender.name,
            status: sender.status || 'A salvo',
            coords: sender.coords,
            timestamp: sender.updatedAt || new Date().toISOString()
          };
          const exists = this.pingHistory.some(h => h.userId === sender.id && h.timestamp === historyEntry.timestamp);
          if (!exists) {
            this.pingHistory.unshift(historyEntry);
            await saveDBItem('status_history', historyEntry);
          }

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
        if (!peer || peer.id === currentUserId) return;

        const existingUser = this.users.find(u => u.id === peer.id);
          const previousStatus = existingUser?.status;
          const statusChanged = previousStatus && previousStatus !== peer.status;
          const isExplicitSOS = data.isPing && peer.status === 'Requiere ayuda';

          await this.registerOrUpdatePeerUser(peer);

          const historyEntry = {
            id: `ping-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            userId: peer.id,
            userName: peer.name,
            status: peer.status || 'A salvo',
            coords: peer.coords,
            timestamp: peer.updatedAt || new Date().toISOString()
          };

          const exists = this.pingHistory.some(h => h.userId === peer.id && h.timestamp === historyEntry.timestamp);
          if (!exists) {
            this.pingHistory.unshift(historyEntry);
            await saveDBItem('status_history', historyEntry);
          }

          const isPing = Boolean(data.isPing);

          // Alert user on status change, explicit SOS, or live status ping
          if (statusChanged || isPing || isExplicitSOS) {
            const title = isExplicitSOS ? `¡SOS de ${peer.name}!` : (isPing ? `Ping de ${peer.name}` : `Estado de ${peer.name}`);
            const message = isPing ? `Reporte en vivo: "${peer.status || 'A salvo'}"` : `Cambió su estado a: "${peer.status || 'A salvo'}"`;
            const pingKey = `peer_ping_${peer.id}_${peer.updatedAt || ''}`;

            if (!this.processedMessageIds.has(pingKey)) {
              this.processedMessageIds.add(pingKey);

              this.pushNotification({
                type: 'status',
                status: peer.status || 'A salvo',
                title,
                message
              });

              const notifStore = useNotificationStore();
              notifStore.notify({
                type: 'status',
                title,
                body: `${peer.name} reportó: "${peer.status || 'A salvo'}"`,
                id: pingKey,
                tabToOpen: 'status'
              });
            }
          }

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
        return;
      }

      if (data.type === 'GOSSIP_BROADCAST') {
        const msg = data.payload;
        if (!msg || !msg.id) return;

        if (this.processedMessageIds.has(msg.id)) return;
        this.processedMessageIds.add(msg.id);

        // Only update contact record if already in contacts or if private direct message
        const isExisting = this.users.some(u => u.id === msg.senderId);
        if (msg.senderId && msg.senderId !== currentUserId && (isExisting || msg.recipientId === currentUserId)) {
          this.registerOrUpdatePeerUser({
            id: msg.senderId,
            name: msg.senderName,
            coords: msg.coords,
            updatedAt: msg.timestamp
          });
        }

        const exists = this.broadcasts.some(b => b.id === msg.id);
        if (!exists) {
          msg.hopCount = (msg.hopCount || 1) + 1;

          const currentMaxSeq = (this.broadcasts || []).reduce((max, b) => Math.max(max, b.seq || 0), 0);
          this.maxSequence = Math.max(this.maxSequence || 0, currentMaxSeq, msg.seq || 0) + 1;
          if (!msg.seq) {
            msg.seq = this.maxSequence;
          }

          this.broadcasts.unshift(msg);
          await saveDBItem('broadcast_messages', msg);
          
          localStorage.setItem('salvate_broadcast_update', Date.now().toString());

          const isForMe = !msg.recipientId || msg.recipientId === currentUserId;
          const isDirectMessage = Boolean(msg.recipientId);

          if (msg.senderId !== currentUserId && isForMe) {
            // Immediate delivery ACK
            const ackPayload = {
              _msgId: `ack_${msg.id}_${currentUserId}_${Date.now()}`,
              type: 'MESSAGE_ACK',
              messageId: msg.id,
              status: 'delivered',
              ackBy: currentUserId,
              ackByName: authStore.userName
            };

            this.broadcastGossipLocally(ackPayload);
            this.peerConnections.forEach(conn => {
              if (conn && conn.open) {
                try { conn.send(ackPayload); } catch (e) {}
              }
            });

            this.pushNotification({
              type: 'broadcast',
              title: isDirectMessage ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
              message: msg.type === 'audio' ? 'Nota de voz recibida' : `"${msg.content}"`
            });
            const notifStore = useNotificationStore();
            notifStore.notify({
              type: 'broadcast',
              title: isDirectMessage ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
              body: msg.type === 'audio' ? 'Nota de voz de emergencia recibida' : (msg.content || 'Nuevo mensaje comunitario'),
              id: msg.id,
              tabToOpen: 'broadcast'
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
        return;
      }

      if (data.type === 'MESSAGE_ACK') {
        const { messageId, status } = data;
        if (!messageId || !status) return;

        const targetMsg = this.broadcasts.find(b => b.id === messageId);
        if (targetMsg && targetMsg.senderId === currentUserId) {
          if (status === 'read') {
            targetMsg.status = 'read';
          } else if (status === 'delivered' && targetMsg.status !== 'read') {
            targetMsg.status = 'delivered';
          }
          await saveDBItem('broadcast_messages', targetMsg);
          localStorage.setItem('salvate_broadcast_update', Date.now().toString());
        }
        return;
      }

      if (data.type === 'MESSAGE_REACTION') {
        const { messageId, emoji, userId } = data;
        if (!messageId || !emoji || !userId) return;

        const targetMsg = this.broadcasts.find(b => b.id === messageId);
        if (targetMsg) {
          if (!targetMsg.reactions) targetMsg.reactions = {};
          if (!targetMsg.reactions[emoji]) targetMsg.reactions[emoji] = [];

          const existingIdx = targetMsg.reactions[emoji].indexOf(userId);
          if (existingIdx >= 0) {
            targetMsg.reactions[emoji].splice(existingIdx, 1);
            if (targetMsg.reactions[emoji].length === 0) {
              delete targetMsg.reactions[emoji];
            }
          } else {
            Object.keys(targetMsg.reactions).forEach(k => {
              targetMsg.reactions[k] = targetMsg.reactions[k].filter(id => id !== userId);
              if (targetMsg.reactions[k].length === 0) delete targetMsg.reactions[k];
            });
            if (!targetMsg.reactions[emoji]) targetMsg.reactions[emoji] = [];
            targetMsg.reactions[emoji].push(userId);
          }

          await saveDBItem('broadcast_messages', targetMsg);
          localStorage.setItem('salvate_broadcast_update', Date.now().toString());
        }
        return;
      }

      if (data.type === 'GOSSIP_HAZARD') {
        const hazard = data.payload;
        if (!hazard || !hazard.id) return;

        const hazardStore = useHazardStore();
        const exists = hazardStore.hazards.some(h => h.id === hazard.id);
        if (!exists) {
          hazard.hopCount = (hazard.hopCount || 1) + 1;
          hazardStore.hazards.unshift(hazard);
          await saveDBItem('hazard_reports', hazard);
          
          localStorage.setItem('salvate_hazards_update', Date.now().toString());

          if (hazard.authorId !== currentUserId) {
            this.pushNotification({
              type: 'hazard',
              status: hazard.severity === 'alta' ? 'Requiere ayuda' : 'En traslado',
              title: `Alerta: ${hazard.title || 'Peligro Reportado'}`,
              message: `${hazard.description || 'Peligro en la zona'} (${hazard.authorName || 'Comunidad'})`
            });
            const notifStore = useNotificationStore();
            notifStore.notify({
              type: 'hazard',
              title: `Alerta de Peligro: ${hazard.title || 'Reporte de Zona'}`,
              body: `${hazard.description || 'Peligro reportado'} (${hazard.authorName || 'Comunidad'})`,
              id: hazard.id,
              tabToOpen: 'hazards'
            });
          }

          this.broadcastGossipLocally({
            type: 'GOSSIP_HAZARD',
            payload: hazard
          });

          this.peerConnections.forEach(conn => {
            if (conn && conn.open && conn.peer !== hazard.authorId) {
              try {
                conn.send({
                  type: 'GOSSIP_HAZARD',
                  payload: hazard
                });
              } catch (e) {}
            }
          });
        }
        return;
      }

      if (data.type === 'SYNC_REQUEST') {
        if (this.broadcasts && this.broadcasts.length > 0) {
          const syncBroadcastsPayload = {
            type: 'SYNC_BROADCASTS',
            payload: this.broadcasts.slice(0, 30)
          };
          this.peerConnections.forEach(conn => {
            if (conn && conn.open) {
              try { conn.send(syncBroadcastsPayload); } catch (e) {}
            }
          });
        }
        const hazardStore = useHazardStore();
        if (hazardStore.hazards && hazardStore.hazards.length > 0) {
          const syncHazardsPayload = {
            type: 'SYNC_HAZARDS',
            payload: hazardStore.hazards.slice(0, 20)
          };
          this.peerConnections.forEach(conn => {
            if (conn && conn.open) {
              try { conn.send(syncHazardsPayload); } catch (e) {}
            }
          });
        }
        return;
      }

      if (data.type === 'SYNC_BROADCASTS') {
        const list = Array.isArray(data.payload) ? data.payload : (Array.isArray(data.broadcasts) ? data.broadcasts : []);
        let hasNew = false;

        for (const msg of list) {
          if (!msg || !msg.id) continue;
          if (this.processedMessageIds.has(msg.id)) continue;
          this.processedMessageIds.add(msg.id);

          const isExisting = this.users.some(u => u.id === msg.senderId);
          if (msg.senderId && msg.senderId !== currentUserId && (isExisting || msg.recipientId === currentUserId)) {
            this.registerOrUpdatePeerUser({
              id: msg.senderId,
              name: msg.senderName,
              coords: msg.coords,
              updatedAt: msg.timestamp
            });
          }

          const exists = this.broadcasts.some(b => b.id === msg.id);
          if (!exists) {
            this.broadcasts.unshift(msg);
            saveDBItem('broadcast_messages', msg).catch(() => {});
            hasNew = true;

            const isForMe = !msg.recipientId || msg.recipientId === currentUserId;
            const isDirectMessage = Boolean(msg.recipientId);

            if (msg.senderId !== currentUserId && isForMe) {
              const ackPayload = {
                _msgId: `ack_${msg.id}_${currentUserId}_${Date.now()}`,
                type: 'MESSAGE_ACK',
                messageId: msg.id,
                status: 'delivered',
                ackBy: currentUserId,
                ackByName: authStore.userName
              };

              this.broadcastGossipLocally(ackPayload);
              this.peerConnections.forEach(conn => {
                if (conn && conn.open) {
                  try { conn.send(ackPayload); } catch (e) {}
                }
              });

              this.pushNotification({
                type: 'broadcast',
                title: isDirectMessage ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
                message: msg.type === 'audio' ? 'Nota de voz recibida' : `"${msg.content}"`
              });
              const notifStore = useNotificationStore();
              notifStore.notify({
                type: 'broadcast',
                title: isDirectMessage ? `Mensaje Privado de ${msg.senderName}` : `Mensaje de ${msg.senderName}`,
                body: msg.type === 'audio' ? 'Nota de voz de emergencia recibida' : (msg.content || 'Nuevo mensaje comunitario'),
                id: msg.id,
                tabToOpen: 'broadcast'
              });
            }
          }
        }

        if (hasNew) {
          localStorage.setItem('salvate_broadcast_update', Date.now().toString());
        }
        return;
      }

      if (data.type === 'SYNC_HAZARDS') {
        const list = Array.isArray(data.payload) ? data.payload : [];
        const hazardStore = useHazardStore();
        let hasNewHazard = false;

        for (const h of list) {
          if (!h || !h.id) continue;
          const exists = hazardStore.hazards.some(item => item.id === h.id);
          if (!exists) {
            hazardStore.hazards.push(h);
            saveDBItem('hazard_reports', h).catch(() => {});
            hasNewHazard = true;
          }
        }

        if (hasNewHazard) {
          hazardStore.hazards.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          localStorage.setItem('salvate_hazards_update', Date.now().toString());
        }
        return;
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
      } else if (type === 'hazard') {
        colorClass = 'bg-amber-950/90 border-amber-500/50 text-amber-100';
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

import { defineStore } from 'pinia';
import { Peer } from 'peerjs';
import { saveDBItem, getAllDBItems, deleteDBItem } from '../services/db';
import { useAuthStore } from './authStore';

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
    pendingNegotiationPC: null
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
      try {
        localStorage.setItem('salvate_live_gossip', JSON.stringify({ ...payload, _ts: Date.now() + Math.random() }));
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

    updateSignalingServer(config, currentUser = null) {
      this.signalingServer = { ...config };
      localStorage.setItem('salvate_signaling_server', JSON.stringify(this.signalingServer));
      if (currentUser) {
        this.setupWebRTCPeer(currentUser);
      }
    },

    setupWebRTCPeer(currentUser) {
      try {
        const cleanPeerId = currentUser.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        if (this.peerInstance && !this.peerInstance.destroyed) {
          try { this.peerInstance.destroy(); } catch (e) {}
        }

        const isCustom = this.signalingServer?.isCustom;
        const host = isCustom ? this.signalingServer.host : '0.peerjs.com';
        const port = isCustom ? Number(this.signalingServer.port) : 443;
        const path = isCustom ? (this.signalingServer.path || '/') : '/';
        const secure = isCustom ? Boolean(this.signalingServer.secure) : true;

        this.peerInstance = new Peer(cleanPeerId, {
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

        this.peerInstance.on('open', (id) => {
          this.isP2PActive = true;
          this.announceSelfToKnownPeers(currentUser);
        });

        this.peerInstance.on('disconnected', () => {
          if (this.peerInstance && !this.peerInstance.destroyed) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              try {
                if (this.peerInstance && this.peerInstance.disconnected) {
                  if (navigator.onLine || this.signalingServer?.isCustom) {
                    this.peerInstance.reconnect();
                  }
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
              if (this.peerInstance && !this.peerInstance.destroyed && this.peerInstance.disconnected) {
                if (navigator.onLine || this.signalingServer?.isCustom) {
                  try { this.peerInstance.reconnect(); } catch (e) {}
                }
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

        if (!this.peerConnections.some(c => c.peer === cleanPeerId)) {
          this.peerConnections.push(wrappedConn);
          this.activePeersCount = this.peerConnections.length;
        }
        this.isP2PActive = true;

        if (currentUser) {
          try {
            wrappedConn.send({
              type: 'STATUS_UPDATE',
              payload: currentUser
            });
            wrappedConn.send({
              type: 'REQUEST_STATUS'
            });
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

        this.pushNotification({
          type: 'status',
          status: 'A salvo',
          title: 'Enlace Offline Establecido',
          message: `Conexión directa P2P vinculada sin internet.`
        });
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

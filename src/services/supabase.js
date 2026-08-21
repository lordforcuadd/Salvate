// Sálvate PWA — Supabase Cloud Sync & Realtime Web Push Client
// Enables hybrid cloud synchronization and remote Web Push to closed devices

const SUPABASE_URL = 'https://vnwpudichitahnugxach.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud3B1ZGljaGl0YWhudWd4YWNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMjMxNDgsImV4cCI6MjEwMjg5OTE0OH0.O1_fWJyuzLSdglYe0bHEhfu8ftVl6YVaK7W-AvRQZFQ';
export const VAPID_PUBLIC_KEY = 'BD56oYjLVWHxv7HRg1GG8KktbRVcqsShyYpMDcl-IyJrn0Gw1Syv8VZXOlI1Flaxue00Dt6dXFwUXaUXe7wzdyU';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLOUD SYNC: Messages, Pings & Hazards
// ─────────────────────────────────────────────────────────────────────────────
export async function syncMessageToCloud(msg) {
  if (!navigator.onLine) return null;
  try {
    const payload = {
      id: msg.id,
      sender_id: msg.senderId,
      sender_name: msg.senderName,
      recipient_id: msg.recipientId || null,
      type: msg.type || 'text',
      content: msg.content || '',
      audio_url: msg.audioUrl || null,
      reply_to: msg.replyTo || null,
      reactions: msg.reactions || {},
      status: msg.status || 'sent',
      coords: msg.coords || null,
      seq: msg.seq || 0
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/salvate_messages`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function fetchRecentCloudMessages(limit = 40) {
  if (!navigator.onLine) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/salvate_messages?select=*&order=created_at.desc&limit=${limit}`,
      { headers }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map(row => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_name,
      recipientId: row.recipient_id,
      type: row.type,
      content: row.content,
      audioUrl: row.audio_url,
      replyTo: row.reply_to,
      reactions: row.reactions || {},
      status: row.status,
      coords: row.coords,
      seq: Number(row.seq || 0),
      timestamp: row.created_at
    }));
  } catch (e) {
    return [];
  }
}

export async function syncPingToCloud(ping) {
  if (!navigator.onLine || !ping) return null;
  try {
    const userId = ping.userId || ping.id;
    const userName = ping.userName || ping.name;
    if (!userId || !userName) return null;

    const payload = {
      id: (ping.pingId || (typeof ping.id === 'string' && ping.id.startsWith('ping_'))) 
        ? ping.id 
        : `ping_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: userId,
      user_name: userName,
      status: ping.status || 'A salvo',
      coords: ping.coords || null,
      is_ping: ping.isPing !== false
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/salvate_pings`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REMOTE WEB PUSH NOTIFICATIONS DISPATCH
// ─────────────────────────────────────────────────────────────────────────────
export async function sendRemoteWebPush({ title, body, type = 'broadcast', tabToOpen = 'dashboard', recipientId = null, senderId = null, tag = null, id = null }) {
  if (!navigator.onLine) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        type,
        tabToOpen,
        recipientId,
        senderId,
        tag: tag || (id ? `salvate-${type}-${id}` : `salvate-${type}`)
      })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REGISTER PUSH SUBSCRIPTION IN SUPABASE
// ─────────────────────────────────────────────────────────────────────────────
export async function registerPushSubscription(userId, subscription) {
  if (!userId || !subscription) return false;
  try {
    const rawSub = typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription;
    const endpoint = rawSub.endpoint;
    const p256dh = rawSub.keys?.p256dh;
    const auth = rawSub.keys?.auth;

    if (!endpoint || !p256dh || !auth) return false;

    const payload = {
      endpoint,
      user_id: userId,
      p256dh,
      auth,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/salvate_push_subscriptions`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SUPABASE REALTIME WEBSOCKET LISTENER (Sub-100ms Instant Cloud Delivery)
// ─────────────────────────────────────────────────────────────────────────────
let realtimeSocket = null;
let heartbeatTimer = null;
let reconnectTimer = null;

export function initSupabaseRealtime({ onMessage, onPing }) {
  if (typeof window === 'undefined' || !window.WebSocket) return;
  if (realtimeSocket && (realtimeSocket.readyState === WebSocket.OPEN || realtimeSocket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsUrl = `wss://vnwpudichitahnugxach.supabase.co/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;

  try {
    realtimeSocket = new WebSocket(wsUrl);

    realtimeSocket.onopen = () => {
      // 1. Join salvate_messages channel
      realtimeSocket.send(JSON.stringify({
        topic: 'realtime:public:salvate_messages',
        event: 'phx_join',
        payload: {
          config: {
            postgres_changes: [
              { event: 'INSERT', schema: 'public', table: 'salvate_messages' },
              { event: 'UPDATE', schema: 'public', table: 'salvate_messages' }
            ]
          }
        },
        ref: 'join_msg'
      }));

      // 2. Join salvate_pings channel
      realtimeSocket.send(JSON.stringify({
        topic: 'realtime:public:salvate_pings',
        event: 'phx_join',
        payload: {
          config: {
            postgres_changes: [
              { event: 'INSERT', schema: 'public', table: 'salvate_pings' }
            ]
          }
        },
        ref: 'join_ping'
      }));

      // Keepalive heartbeat
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (realtimeSocket && realtimeSocket.readyState === WebSocket.OPEN) {
          realtimeSocket.send(JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: 'hb_' + Date.now()
          }));
        }
      }, 25000);
    };

    realtimeSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'postgres_changes') {
          const record = data.payload?.data?.record;
          const table = data.payload?.data?.table;

          if (table === 'salvate_messages' && record && onMessage) {
            onMessage({
              id: record.id,
              senderId: record.sender_id,
              senderName: record.sender_name,
              recipientId: record.recipient_id,
              type: record.type,
              content: record.content,
              audioUrl: record.audio_url,
              replyTo: record.reply_to,
              reactions: record.reactions || {},
              status: record.status,
              coords: record.coords,
              seq: Number(record.seq || 0),
              timestamp: record.created_at
            });
          } else if (table === 'salvate_pings' && record && onPing) {
            onPing({
              id: record.id,
              userId: record.user_id,
              userName: record.user_name,
              status: record.status,
              coords: record.coords,
              isPing: record.is_ping,
              timestamp: record.created_at
            });
          }
        }
      } catch (e) {}
    };

    realtimeSocket.onclose = () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (navigator.onLine) {
        reconnectTimer = setTimeout(() => {
          initSupabaseRealtime({ onMessage, onPing });
        }, 3000);
      }
    };

    realtimeSocket.onerror = () => {
      try { realtimeSocket.close(); } catch (e) {}
    };
  } catch (e) {}
}

// Utility to convert VAPID base64 string to Uint8Array for PushManager
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}



// Sálvate PWA — Supabase Cloud Sync & Realtime Web Push Client
// Enables hybrid cloud synchronization and remote Web Push to closed devices

const SUPABASE_URL = 'https://wyvsemwtosymaestkdxh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dnNlbXd0b3N5bWFlc3RrZHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MzU0MjEsImV4cCI6MjA5MzMxMTQyMX0.KHWIlzZwoP7yNhmapEZ-t_ilPVyIse2-WIZJpXtsS0E';
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
  if (!navigator.onLine) return null;
  try {
    const payload = {
      id: ping.id || `ping_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      user_id: ping.userId,
      user_name: ping.userName,
      status: ping.status || 'A salvo',
      coords: ping.coords || null,
      is_ping: Boolean(ping.isPing)
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
export async function sendRemoteWebPush({ title, body, type = 'broadcast', tabToOpen = 'dashboard', recipientId = null, senderId = null }) {
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
        senderId
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
      id: `sub_${userId}_${btoa(endpoint).slice(-16).replace(/[^a-zA-Z0-9]/g, '_')}`,
      user_id: userId,
      endpoint,
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

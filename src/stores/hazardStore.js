import { defineStore } from 'pinia';
import { getAllDBItems, saveDBItem, deleteDBItem } from '../services/db';
import { useMeshStore } from './meshStore';

export const useHazardStore = defineStore('hazard', {
  state: () => ({
    hazards: [],
    syncPendingCount: 0,
  }),

  getters: {
    activeHazards: (state) => state.hazards,
    landslideCount: (state) => state.hazards.filter(h => h.type === 'landslide').length,
    gasLeakCount: (state) => state.hazards.filter(h => h.type === 'gas_leak').length,
    roadBlockCount: (state) => state.hazards.filter(h => h.type === 'road_block').length,
  },

  actions: {
    async initHazardStore() {
      const dbHazards = await getAllDBItems('hazard_reports');
      this.hazards = (dbHazards || []).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      this.syncPendingCount = this.hazards.filter(h => !h.synced).length;
    },

    async addHazardReport(reportData) {
      const newReport = {
        id: `hz-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: reportData.type,
        title: reportData.title,
        description: reportData.description || '',
        severity: reportData.severity || 'media',
        coords: reportData.coords || { lat: -12.046374, lng: -77.042793 },
        authorName: reportData.authorName || 'Anónimo',
        timestamp: new Date().toISOString(),
        synced: navigator.onLine
      };

      // Add locally
      this.hazards.unshift(newReport);
      await saveDBItem('hazard_reports', newReport);
      this.syncPendingCount = this.hazards.filter(h => !h.synced).length;

      // Broadcast over P2P mesh & BroadcastChannel to other devices
      const meshStore = useMeshStore();
      
      const hazardPayload = {
        type: 'GOSSIP_HAZARD',
        payload: newReport
      };

      if (meshStore.broadcastChannel) {
        meshStore.broadcastChannel.postMessage(hazardPayload);
      }

      meshStore.peerConnections.forEach(conn => {
        if (conn.open) {
          try { conn.send(hazardPayload); } catch (e) {}
        }
      });

      // Trigger notification toast (Emoji-free)
      meshStore.pushNotification({
        type: 'hazard',
        status: newReport.severity === 'alta' ? 'Requiere ayuda' : 'En traslado',
        title: 'Nueva Alerta de Peligro',
        message: `${newReport.title} - ${newReport.authorName}`
      });

      return newReport;
    },

    async removeHazard(id) {
      this.hazards = this.hazards.filter(h => h.id !== id);
      await deleteDBItem('hazard_reports', id);
      this.syncPendingCount = this.hazards.filter(h => !h.synced).length;
    }
  }
});

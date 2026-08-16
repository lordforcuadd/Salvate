import { defineStore } from 'pinia';

export const useDialogStore = defineStore('dialog', {
  state: () => ({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    variant: 'danger', // 'danger' | 'warning' | 'info' | 'primary'
    onConfirmCallback: null,
    onCancelCallback: null,
  }),

  actions: {
    confirm({
      title = '¿Confirmar acción?',
      message = 'Esta acción no se puede deshacer.',
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      variant = 'danger',
      onConfirm = null,
      onCancel = null
    }) {
      this.title = title;
      this.message = message;
      this.confirmText = confirmText;
      this.cancelText = cancelText;
      this.variant = variant;
      this.onConfirmCallback = onConfirm;
      this.onCancelCallback = onCancel;
      this.isOpen = true;
    },

    alert({
      title = 'Información',
      message = '',
      confirmText = 'Entendido',
      variant = 'info'
    }) {
      this.title = title;
      this.message = message;
      this.confirmText = confirmText;
      this.cancelText = null; // No cancel button for simple alerts
      this.variant = variant;
      this.onConfirmCallback = null;
      this.onCancelCallback = null;
      this.isOpen = true;
    },

    handleConfirm() {
      if (this.onConfirmCallback) {
        this.onConfirmCallback();
      }
      this.isOpen = false;
    },

    handleCancel() {
      if (this.onCancelCallback) {
        this.onCancelCallback();
      }
      this.isOpen = false;
    }
  }
});

import type { ViewHook } from "@hotdogjs/client/hook";

export const Modal: ViewHook = {
  mounted() {
    // if the element is a dialog, listen for show-modal and hide-modal events
    if (this.el instanceof HTMLDialogElement) {
      const dialog = this.el as HTMLDialogElement;
      window.addEventListener("show-modal", (e) => {
        if (e.target instanceof HTMLDialogElement && e.target.id === dialog.id) {
          dialog.showModal();
        }
      });

      window.addEventListener("hide-modal", (e) => {
        if (e.target instanceof HTMLDialogElement && e.target.id === dialog.id) {
          dialog.close();
        }
      });
    }
  },
};

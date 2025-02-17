import { BaseComponent, html, JS, type AnyPushEvent, type ComponentContext, type Template } from "hotdogjs";

type ModalEvents = {
  type: "close";
};

/**
 * Modal is a component that displays a modal dialog.
 */
export class Modal extends BaseComponent<ModalEvents> {
  /**
   * The id of the modal.
   */
  id: number;
  /**
   * Whether to show the modal when mounted.
   */
  showOnMount: boolean;
  /**
   * The body of the modal.
   */
  body: Template;

  constructor(id: number, body?: Template, showOnMount: boolean = false) {
    super();
    this.id = id;
    this.showOnMount = showOnMount;
    this.body = body ?? html``;
  }

  /**
   * The dom id of the modal.
   */
  get domId(): string {
    return `modal_${this.id}`;
  }

  get showEvent(): AnyPushEvent {
    return {
      type: "js-exec",
      to: `#${this.domId}`,
      attr: "data-show",
    };
  }

  get hideEvent(): AnyPushEvent {
    return {
      type: "hide-modal",
      to: `#${this.domId}`,
      attr: "data-hide",
    };
  }

  update(ctx: ComponentContext<ModalEvents>): void {
    if (this.showOnMount) {
      ctx.pushEvent(this.showEvent);
    }
  }

  render() {
    const showJs = new JS().dispatch("show-modal", { to: `#${this.domId}` });
    const hideJs = new JS().dispatch("hide-modal", { to: `#${this.domId}` });
    return html`<dialog
      id="${this.domId}"
      data-show="${showJs}"
      data-hide="${hideJs}"
      hd-target="${this.cid}"
      hd-hook="Modal"
      class="modal modal-bottom sm:modal-middle">
      <div class="modal-box">
        ${this.body}
        <div class="modal-action">
          <form method="dialog">
            <!-- if there is a button in form, it will close the modal -->
            <button class="btn" hd-click="${hideJs}">Close</button>
          </form>
        </div>
      </div>
    </dialog>`;
  }
}

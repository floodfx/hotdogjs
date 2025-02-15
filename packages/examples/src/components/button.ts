import { BaseComponent, html, type AnyEvent } from "hotdogjs";

/**
 * Btn is a stateless component that has type safe onClick checking for a given event type and optional disabled state.
 */
export class Btn<T extends AnyEvent = never> extends BaseComponent<T> {
  label: string;
  onClick: T["type"];
  disabled?: boolean;

  constructor(props: { label: string; onClick: T["type"]; disabled?: boolean }) {
    super();
    this.label = props.label;
    this.onClick = props.onClick;
    this.disabled = props.disabled;
  }

  render() {
    return html`<button class="btn btn-primary" hd-click="${this.onClick}" ${this.disabled ? "disabled" : ""}>
      ${this.label}
    </button>`;
  }
}

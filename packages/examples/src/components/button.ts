import { BaseComponent, html, safe, type AnyEvent } from "hotdogjs";

type EventParam = { key: string; value: unknown };

/**
 * Btn is a stateless component that has type safe onClick checking for a given event type and optional disabled state.
 */
export class Btn<T extends AnyEvent = never> extends BaseComponent<T> {
  label: string;
  onClick: T["type"];
  disabled?: boolean;
  clickParam?: EventParam;
  constructor(props: { label: string; onClick: T["type"]; disabled?: boolean; clickParam?: EventParam }) {
    super();
    this.label = props.label;
    this.onClick = props.onClick;
    this.disabled = props.disabled;
    this.clickParam = props.clickParam;
  }

  render() {
    const param = this.clickParam ? safe(`hd-value-${this.clickParam.key}="${this.clickParam.value}"`) : "";
    return html`<button class="btn btn-primary" hd-click="${this.onClick}" ${this.disabled ? "disabled" : ""} ${param}>
      ${this.label}
    </button>`;
  }
}

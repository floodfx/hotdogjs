import { BaseComponent, html, type AnyEvent } from "hotdogjs";

export class Btn<T extends AnyEvent = never> extends BaseComponent<T> {
  label: string;
  onClick: T["type"];
  constructor(props: { label: string; onClick: T["type"] }) {
    super();
    this.label = props.label;
    this.onClick = props.onClick;
  }
  render() {
    return html`<button class="btn btn-sm" hd-click="${this.onClick}">${this.label}</button>`;
  }
}

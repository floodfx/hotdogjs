import { BaseComponent, html, type Template } from "hotdogjs";

export class Link extends BaseComponent {
  label: Template;
  href: string;
  classes?: string;

  constructor(props: { href: string; classes?: string; label: Template }) {
    super();
    this.href = props.href;
    this.classes = props.classes ?? "link link-hover link-secondary";
    this.label = props.label;
  }

  render() {
    return html`<a class="${this.classes}" href="${this.href}">${this.label}</a>`;
  }
}

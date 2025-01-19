import { BaseComponent, html, type ComponentContext } from "hotdogjs";

export class Checkbox extends BaseComponent {
  checked: boolean;
  preloaded: boolean = false;

  constructor(props: { id: number; checked: boolean }) {
    super();
    this.checked = props.checked;
    this.id = props.id;
  }

  preload(cs: Checkbox[]): Checkbox[] {
    return cs.map((c) => {
      c.preloaded = true;
      return c;
    });
  }

  handleEvent(ctx: ComponentContext<any>, event: any) {
    switch (event.type) {
      case "toggle":
        this.checked = !this.checked;
    }
  }

  render() {
    return html`<input
      type="checkbox"
      ${this.checked ? "checked" : ""}
      data-preloaded=${this.preloaded}
      hd-click="toggle"
      hd-target="${this.cid}" /> `;
  }
}

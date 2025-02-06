import { BaseComponent, html, type ComponentContext } from "hotdogjs";

export class Toggle extends BaseComponent {
  checked: boolean;

  constructor(props: { id: number; checked: boolean }) {
    super();
    this.checked = props.checked;
    this.id = props.id;
  }

  handleEvent(_ctx: ComponentContext<any>, event: any) {
    switch (event.type) {
      case "toggle":
        this.checked = !this.checked;
    }
  }

  render() {
    return html`<input
      type="checkbox"
      class="toggle"
      ${this.checked ? "checked" : ""}
      hd-click="toggle"
      hd-target="${this.cid}" /> `;
  }
}

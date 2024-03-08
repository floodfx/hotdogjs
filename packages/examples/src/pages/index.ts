import { Hello } from "components/hello";
import { Checkbox } from "components/toggle";
import { BaseView, html, type ViewContext } from "hotdogjs-core";

export default class Index extends BaseView<any> {
  handleEvent(ctx: ViewContext<any>, event: any): void | Promise<void> {
    console.log("event", event);
  }

  render() {
    return html`
      <h2>Hello</h2>
      <p>Welcome to the HotdogJS example app.</p>
      ${this.component(new Hello({ name: "world" }))}, ${this.component(new Hello({ name: "Donnie" }))}
      <h2>Checkbox</h2>
      <div>Not Checked ${this.component(new Checkbox({ id: 1, checked: false }))}</div>
      <div>Checked ${this.component(new Checkbox({ id: 2, checked: true }))}</div>
    `;
  }
}

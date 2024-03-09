import { Hello } from "components/hello";
import { Checkbox } from "components/toggle";
import { BaseView, html, type AnyEvent, type RenderMeta } from "hotdogjs-core";

export default class Index extends BaseView<AnyEvent> {
  render(meta: RenderMeta<AnyEvent>) {
    const { component } = meta;
    return html`
      <h2>Hello</h2>
      <p>Welcome to the HotdogJS example app.</p>
      ${component(new Hello({ name: "world" }))}, ${component(new Hello({ name: "Donnie" }))}
      <h2>Checkbox</h2>
      <div>Not Checked ${component(new Checkbox({ id: 1, checked: false }))}</div>
      <div>Checked ${component(new Checkbox({ id: 2, checked: true }))}</div>
    `;
  }
}

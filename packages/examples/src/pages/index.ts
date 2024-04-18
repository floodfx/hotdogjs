import { BaseComponent, BaseView, html, type AnyEvent, type RenderMeta, type ViewContext } from "hotdogjs";
import { Checkbox } from "../components/toggle";

class Hello extends BaseComponent<AnyEvent> {
  name: string;
  constructor(props: { name: string }) {
    super();
    this.name = props.name;
  }

  render() {
    return html`<span>Hello, ${this.name}</span>`;
  }
}

export default class Index extends BaseView<AnyEvent> {
  handleEvent(ctx: ViewContext<AnyEvent>, event: AnyEvent): void | Promise<void> {
    if (event.type === "redirect-me") {
      ctx.redirect(new URL("/counter", ctx.url.origin));
    }
  }

  render(meta: RenderMeta<AnyEvent>) {
    const { component } = meta;
    var checkbox = component(new Checkbox({ id: 1, checked: false }));
    return html`
      <h2>Hello</h2>
      <p>Welcome to the HotdogJS example app.</p>
      ${component(new Hello({ name: "world" }))}, ${component(new Hello({ name: "Donnie" }))}
      <h2>Checkbox</h2>
      <div>Not Checked ${checkbox}</div>
      <div>Checked ${component(new Checkbox({ id: 2, checked: true }))}</div>

      <button phx-click="redirect-me">Redirect</button>
    `;
  }
}

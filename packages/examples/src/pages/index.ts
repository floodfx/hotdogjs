import { BaseComponent, BaseView, html, type AnyEvent, type ViewContext } from "hotdogjs";
import { Toggle } from "src/components/toggle";

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

  render() {
    var toggle = new Toggle({ id: 1, checked: false });
    return html`
      <h2>Hello</h2>
      <p>Welcome to the HotdogJS example app.</p>
      ${new Hello({ name: "world" })}, ${new Hello({ name: "Donnie" })}
      <h2>Toggle</h2>
      <div>Not Checked ${toggle}</div>
      <div>Checked ${new Toggle({ id: 2, checked: true })}</div>

      <button hd-click="redirect-me">Redirect</button>
    `;
  }
}

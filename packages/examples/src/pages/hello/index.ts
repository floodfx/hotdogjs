import { AnyEvent, BaseView, MountEvent, ViewContext } from "hotdogjs-core";

export default class Html extends BaseView<AnyEvent> {
  name: string = "world";

  mount(ctx: ViewContext<AnyEvent>, e: MountEvent): void | Promise<void> {
    this.name = e.query.name ?? "world";
  }

  render = () => this.renderFile(import.meta);
}

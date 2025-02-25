import { html, type MountEvent, type ViewContext } from "hotdogjs";
import Counter, { CounterEvent } from "../counter";

type PubSubEvent = CounterEvent | { type: "count-change"; count: number };

/**
 * PubSubCounter extends Counter and publishes and subscribes to count-change events to
 * sync the count between multiple instances of the counter.
 */
export default class PubSubCounter extends Counter {
  constructor() {
    super();
  }

  async mount(ctx: ViewContext<PubSubEvent>, e: MountEvent) {
    super.mount(ctx, e);
    if (ctx.connected) {
      await ctx.subscribe("count-change");
    }
  }

  handleEvent(ctx: ViewContext<PubSubEvent>, event: PubSubEvent) {
    if (event.type === "count-change") {
      this.count = event.count;
    } else {
      super.handleEvent(ctx, event);
      ctx.publish({ type: "count-change", count: this.count });
    }
  }

  render() {
    return html`
      <div class="flex flex-col justify-start items-center gap-4 mx-auto pt-8">
        <a class="link" href="/pubsub/counter" target="_blank">Open another counter instance in new tab</a>
        ${super.render()}
      </div>
    `;
  }
}

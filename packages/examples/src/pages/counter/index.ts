import { BaseView, MountEvent, ViewContext, html } from "hotdogjs";

export type CounterEvent = { type: "inc" | "dec" };

/**
 * Counter is a simple counter view that increments and decrements a count based on button clicks.
 */
export default class Counter extends BaseView<CounterEvent> {
  count: number = 0;
  layoutName = "nav.html";

  mount(ctx: ViewContext<CounterEvent>, e: MountEvent) {
    this.count = parseInt(e.params.count) || 0;
    if (this.count > 99) {
      ctx.pushRedirect("/counter/99");
    }
  }

  handleEvent(ctx: ViewContext<CounterEvent>, event: CounterEvent) {
    if (event.type === "inc") this.count++;
    switch (event.type) {
      case "inc":
        this.count++;
        return;
      case "dec":
        this.count--;
    }
  }

  render() {
    return html`
      <div class="flex flex-col justify-center items-center gap-4 mx-auto pt-8">
        <div class="card bg-base-100 shadow-xl border border-gray-300">
          <div class="card-body">
            <h2 class="card-title">Counter</h2>
            <p>Click the buttons to adjust the count.</p>
            <h3 class="text-4xl font-bold">${this.count}</h3>
            <div class="card-actions">
              <button class="btn btn-primary" hd-click="dec">-</button>
              <button class="btn btn-primary" hd-click="inc">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

import { BaseView, MountEvent, ViewContext, html } from "hotdogjs";
import { Btn } from "../../components/button";

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
              ${new Btn<Event>({ label: "-", onClick: "dec" })} ${new Btn<Event>({ label: "+", onClick: "inc" })}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

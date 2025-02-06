import { BaseView, MountEvent, ViewContext, html } from "hotdogjs";
import { Btn } from "src/components/button";

type Event = { type: "inc" } | { type: "dec" };

export default class Counter extends BaseView<Event> {
  count: number = 0;
  layoutName = "nav.html";

  mount(ctx: ViewContext<Event>, e: MountEvent) {
    this.count = parseInt(e.params.count) || 0;
    if (this.count > 99) {
      ctx.pushRedirect("/counter/99");
    }
  }

  handleEvent(ctx: ViewContext<Event>, event: Event) {
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
      <div class="stats shadow-lg border-2 border-primary m-4">
        <div class="stat">
          <div class="stat-title">Count</div>
          <div class="stat-value">${this.count}</div>
          <div class="stat-desc">click the buttons to adjust</div>
          <div class="stat-actions">
            ${new Btn<Event>({ label: "-", onClick: "dec" })} ${new Btn<Event>({ label: "+", onClick: "inc" })}
          </div>
        </div>
      </div>
    `;
  }
}

import { BaseView, MountEvent, ViewContext, html } from "hotdogjs-core";

type Event = { type: "inc" } | { type: "dec" };

export default class Counter extends BaseView<Event> {
  count: number = 0;

  mount(ctx: ViewContext<Event>, e: MountEvent) {
    this.count = parseInt(e.params.count) || 0;
    if (this.count > 99) {
      ctx.pushRedirect("/counter/99");
    }
  }

  handleEvent(ctx: ViewContext<Event>, event: Event) {
    console.log("handleEvent", event);
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
      <div class="stats shadow m-4">
        <div class="stat">
          <div class="stat-title">Count</div>
          <div class="stat-value">${this.count}</div>
          <div class="stat-desc">click the buttons to adjust</div>
          <div class="stat-actions">
            <button class="btn btn-sm" phx-click="dec">-</button>
            <button class="btn btn-sm" phx-click="inc">+</button>
          </div>
        </div>
      </div>
    `;
  }
}

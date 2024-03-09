import { BaseComponent, BaseView, MountEvent, ViewContext, html, type RenderMeta } from "hotdogjs-core";

type Event = { type: "refresh" };

/**
 * Dashboard that automatically refreshes every second or when a user hits refresh.
 */
export default class Dashboard extends BaseView<Event> {
  newOrders: number;
  salesAmount: number;
  rating: number;

  timer?: ReturnType<typeof setInterval>;

  constructor() {
    super();
    this.newOrders = randomNewOrders();
    this.salesAmount = randomSalesAmount();
    this.rating = randomRating();
  }

  mount(ctx: ViewContext<Event>, _me: MountEvent) {
    this.newOrders = randomNewOrders();
    this.salesAmount = randomSalesAmount();
    this.rating = randomRating();
    if (ctx.connected) {
      this.timer = setInterval(() => {
        ctx.dispatchEvent("refresh");
      }, 1000);
    }
  }

  handleEvent(ctx: ViewContext<Event>, event: Event) {
    if (event.type === "refresh") {
      this.newOrders = randomNewOrders();
      this.salesAmount = randomSalesAmount();
      this.rating = randomRating();
    }
  }

  render(meta: RenderMeta<Event>) {
    const { component } = meta;
    return html`
      <h1>Sales Dashboard</h1>
      <div class="stats shadow">
        ${component(new Stat("🥡 New Orders", this.newOrders))}
        ${component(new Stat("💰 Sales Amount", numberToCurrency(this.salesAmount)))}
        ${component(new Stat("🌟 Rating", ratingToStars(this.rating)))}
      </div>
      <button phx-click="refresh">↻ Refresh</button>
    `;
  }

  shutdown(): void {
    clearInterval(this.timer);
  }
}

class Stat extends BaseComponent {
  title: string;
  value: string | number;
  desc?: string;

  constructor(title: string, value: string | number, desc?: string) {
    super();
    this.title = title;
    this.value = value;
    this.desc = desc;
  }

  render() {
    const { title, value, desc } = this;
    return html`<div class="stat">
      <div class="stat-figure text-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="inline-block w-8 h-8 stroke-current">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
        </svg>
      </div>
      <div class="stat-title">${title}</div>
      <div class="stat-value text-primary">${value}</div>
      ${desc ? html`<div class="stat-desc">${desc}</div>` : ""}
    </div>`;
  }
}

// display star emojis given a rating
function ratingToStars(rating: number): string {
  const stars: string[] = [];
  let i = 0;
  for (; i < rating; i++) {
    stars.push("⭐");
  }
  for (; i < 5; i++) {
    stars.push("✩");
  }
  return stars.join("");
}

// generate a random number between min and max
const random = (min: number, max: number): (() => number) => {
  return () => Math.floor(Math.random() * (max - min + 1)) + min;
};

const randomSalesAmount = random(100, 1000);
const randomNewOrders = random(5, 20);
const randomRating = random(1, 5);

export function numberToCurrency(amount: number) {
  var formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  return formatter.format(amount);
}

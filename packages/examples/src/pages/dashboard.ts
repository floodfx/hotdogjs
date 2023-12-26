import { BaseView, MountEvent, ViewContext, html } from "hotdogjs-core";

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

  render() {
    return html`
      <h1>Sales Dashboard</h1>
      <hr />
      <span>🥡 New Orders</span>
      <h2>${this.newOrders}</h2>
      <hr />
      <span>💰 Sales Amount</span>
      <h2>${numberToCurrency(this.salesAmount)}</h2>
      <hr />
      <span>🌟 Rating</spa>
      <h2>${ratingToStars(this.rating)}</h2>

      <br />
      <br />
      <button phx-click="refresh">↻ Refresh</button>
    `;
  }

  shutdown(): void {
    clearInterval(this.timer);
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

import { BaseComponent, BaseView, MountEvent, ViewContext, html } from "hotdogjs";

type Event = { type: "refresh" };

/**
 * Dashboard that automatically refreshes every second or when a user hits refresh.
 */
export default class Dashboard extends BaseView<Event> {
  itemsInCart: number;
  salesAmount: number;
  rating: number;

  timer?: ReturnType<typeof setInterval>;

  constructor() {
    super();
    this.itemsInCart = randomItemsInCart();
    this.salesAmount = randomSalesAmount();
    this.rating = randomRating();
  }

  mount(ctx: ViewContext<Event>, _me: MountEvent) {
    this.itemsInCart = randomItemsInCart();
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
      this.itemsInCart = randomItemsInCart();
      this.salesAmount = randomSalesAmount();
      this.rating = randomRating();
    }
  }

  render() {
    return html`
      <div class="flex flex-col items-center justify-start h-screen pt-10 gap-10">
        <h1 class="text-2xl font-bold">Live Sales Dashboard</h1>
        <div class="stats shadow-lg border border-gray-300">
          ${new Stat("🛒 Items in Cart", this.itemsInCart)}
          ${new Stat("💰 Sales Amount", numberToCurrency(this.salesAmount))}
          ${new Stat("🌟 Rating", ratingToStars(this.rating))}
        </div>
        <button class="btn btn-primary" hd-click="refresh">↻ Refresh</button>
      </div>
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
      <div class="stat-title text-lg font-bold">${title}</div>
      <div class="stat-value text-primary font-bold">${value}</div>
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
const randomItemsInCart = random(2, 20);
const randomRating = random(1, 5);

export function numberToCurrency(amount: number) {
  var formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  return formatter.format(amount);
}

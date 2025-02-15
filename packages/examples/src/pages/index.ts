import { BaseComponent, BaseView, html, JS, type AnyEvent } from "hotdogjs";
import { Btn } from "src/components/button";

class ExampleCard extends BaseComponent<AnyEvent> {
  title: string;
  description: string;
  imageUrl: string;
  buttonText: string;
  buttonHref: string;
  constructor(props: { title: string; description: string; imageUrl: string; buttonText: string; buttonHref: string }) {
    super();
    this.title = props.title;
    this.description = props.description;
    this.imageUrl = props.imageUrl;
    this.buttonText = props.buttonText;
    this.buttonHref = props.buttonHref;
  }

  render() {
    return html`<div class="card bg-base-100 w-96 shadow-xl border border-gray-200">
      <figure class="px-10 pt-10">
        <img src="${this.imageUrl}" alt="${this.title}" class="rounded-xl border border-primary" />
      </figure>
      <div class="card-body items-center text-center">
        <h2 class="card-title">${this.title}</h2>
        <p>${this.description}</p>
        <div class="card-actions">
          ${new Btn<AnyEvent>({ label: this.buttonText, onClick: new JS().navigate(this.buttonHref).toString() })}
        </div>
      </div>
    </div>`;
  }
}

const examples = [
  new ExampleCard({
    title: "Countdown",
    description: "A countdown timer with server fired hotdog confetti",
    imageUrl: "/static/images/countdown_teaser.png",
    buttonText: "View",
    buttonHref: "/countdown",
  }),
  new ExampleCard({
    title: "Toppings",
    description: "Choose toppings with keyboard navigation",
    imageUrl: "/static/images/toppings_teaser.png",
    buttonText: "View",
    buttonHref: "/toppings",
  }),
];

export default class Index extends BaseView<AnyEvent> {
  render() {
    return html`<div class="flex flex-col gap-4">${examples.map((example) => example)}</div>`;
  }
}

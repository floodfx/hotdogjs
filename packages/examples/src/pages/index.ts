import { BaseComponent, BaseView, html, type AnyEvent } from "hotdogjs";
import { examples, type Example } from "src/data/examples";

class ExampleCard extends BaseComponent<AnyEvent> {
  title: string;
  description: string;
  tags: string[];
  imageUrl: string;
  path: string;
  constructor(props: Example) {
    super();
    this.title = props.title;
    this.description = props.description;
    this.imageUrl = props.imageUrl;
    this.tags = props.tags;
    this.path = props.path;
  }

  render() {
    return html`<a href="${this.path}">
      <div class="card bg-base-100 w-96 shadow-xl border border-gray-200">
        <figure class="px-10 pt-10 h-48 flex items-center justify-center">
          <img
            src="${this.imageUrl}"
            alt="${this.title}"
            class="rounded-xl border border-primary w-full h-full object-contain" />
        </figure>
        <div class="card-body items-center text-center">
          <h2 class="card-title">${this.title}</h2>
          <div class="flex flex-wrap gap-2">
            ${this.tags.map((tag) => html`<div class="badge badge-sm badge-outline font-mono">${tag}</div>`)}
          </div>
          <p>${this.description}</p>
        </div>
      </div>
    </a>`;
  }
}

const exampleCards = examples.map((example) => new ExampleCard(example));

export default class Index extends BaseView<AnyEvent> {
  render() {
    return html`<div class="flex justify-center">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        ${exampleCards.map((example) => example)}
      </div>
    </div>`;
  }
}

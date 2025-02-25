import { BaseComponent, BaseView, html, type AnyEvent, type Template } from "hotdogjs";

const flights = [
  {
    number: "450",
    origin: "DEN",
    destination: "ORD",
  },
  {
    number: "450",
    origin: "DEN",
    destination: "ORD",
  },
  {
    number: "450",
    origin: "DEN",
    destination: "ORD",
  },
  {
    number: "450",
    origin: "DEN",
    destination: "ORD",
  },
  {
    number: "860",
    origin: "DFW",
    destination: "ORD",
  },
  {
    number: "860",
    origin: "DFW",
    destination: "ORD",
  },
  {
    number: "860",
    origin: "DFW",
    destination: "ORD",
  },
  {
    number: "740",
    origin: "DAB",
    destination: "DEN",
  },
  {
    number: "740",
    origin: "DAB",
    destination: "DEN",
  },
  {
    number: "740",
    origin: "DAB",
    destination: "DEN",
  },
];

class DynComponent extends BaseComponent {
  count: number;
  constructor(count: number) {
    super();
    this.count = count;
  }

  render(): Template {
    return html`my count is ${this.count}`;
  }
}

export default class DynArray extends BaseView<AnyEvent> {
  render() {
    const dens = flights.filter((f) => f.origin == "DEN");
    const notDens = flights.filter((f) => f.origin != "DEN");

    return html`<div>
        ${flights.map((flight) => {
          return flight.origin == "DEN" ? html`<span>🏠</span>${true ? html`AND` : ""}` : html`<span>🛩️</span> `;
        })}
      </div>
      <div>${[0, 1, 2].map((i) => new DynComponent(i))}</div>
      <div>
        ${[3, 4, 5].map((i) => {
          if (i % 2 == 0) {
            return new DynComponent(i);
          } else {
            return html`foo${i}`;
          }
        })}
      </div> `;
  }
}

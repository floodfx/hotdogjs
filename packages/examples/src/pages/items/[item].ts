import { BaseView, MountEvent, ViewContext, html } from "hotdogjs";

type Events =
  | {
      type: "my_event";
      something: string;
    }
  | {
      type: "my_other_event";
      differentThing: string;
    }
  | {
      type: "only_type";
    };

export default class ItemView extends BaseView<Events> {
  item?: string;

  mount(ctx: ViewContext<Events>, me: MountEvent): void {
    this.item = me.params.item;
    ctx.dispatchEvent("only_type");
  }

  handleEvent(ctx: ViewContext<Events>, e: Events): void {
    switch (e.type) {
      case "my_event": {
        console.log("my_event", e.something);
        break;
      }
      case "my_other_event": {
        console.log("my_other_event", e.differentThing);
        break;
      }
      case "only_type": {
        console.log("only_type");
        this.item += "!";
        break;
      }
    }
  }

  render() {
    return html`
      <div>
        <h1>Item: ${this.item}</h
      </div>
    `;
  }
}

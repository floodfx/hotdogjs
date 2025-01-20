import { BaseView, html, type RenderMeta, type ViewContext } from "hotdogjs";

/**
 * Define the events that this view can handle
 */
type Event = { type: "toggle-caps" } | { type: "say", msg: string };

/**
 * Example LiveView where users can enter a message and toggle caps on the message.
 */
export default class Index extends BaseView<Event> {

  // properties of the LiveView
  caps: boolean = false;
  msg: string = "Hello, World";

  /**
   * Event handler for the LiveView, automatically called when an event is triggered
   */
  handleEvent(ctx: ViewContext<Event>, event: Event) {
    switch(event.type) {
      case "toggle-caps":
        this.caps = !this.caps;
        break;
      case "say":
        this.msg = event.msg;
        break;
    }
  }

  /**
   * Render the LiveView based on the current state
   */
  render(meta: RenderMeta<Event>) {
    return html`
      <div class="bg-gray-100 p-4 m-4 ">
        <form hd-change="say">
          <label class="label">Enter your message:</label>
          <input  type="text" name="msg" value="${this.msg}" class="input input-bordered">
          <input type="hidden" name="_csrf_token" value="${meta.csrfToken}">
        </form>
        <div class="pt-4">
          <p>Saying: ${this.caps ? this.msg.toUpperCase() : this.msg}</p>
          <button class="btn bg-secondary text-white" hd-click="toggle-caps">Toggle Caps</button>
        </div>
      </div>
    `;
  }
}

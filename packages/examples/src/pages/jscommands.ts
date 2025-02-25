import { BaseView, html, JS, type AnyEvent, type ViewContext } from "hotdogjs";

export default class JSCommands extends BaseView<AnyEvent> {
  value = 0;

  handleEvent(ctx: ViewContext<AnyEvent>, event: AnyEvent): void | Promise<void> {
    if (event.type === "increment") {
      this.value++;
    }
  }

  render() {
    return html`
      <script>
        window.addEventListener("copy-to-clipboard", function (event) {
          if ("clipboard" in navigator) {
            const text = event.target.textContent;
            navigator.clipboard.writeText(text);
          }
        });
      </script>

      <div class="max-w-3xl mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold mb-8 text-center">JS Commands</h1>

        <div class="mb-12">
          <h3 class="text-xl font-semibold mb-4">Show/Hide</h3>
          <div class="flex gap-2 mb-4">
            <button class="btn btn-primary" hd-click="${new JS().show({ to: "#bq" })}">Show</button>
            <button class="btn btn-primary" hd-click="${new JS().hide({ to: "#bq" })}">Hide</button>
          </div>
          <blockquote id="bq" class="hint p-4 bg-gray-100 rounded">
            <p>JS Commands let you update the DOM without making a trip to the server.</p>
          </blockquote>
        </div>

        <hr class="my-8" />

        <div class="mb-12">
          <h3 class="text-xl font-semibold mb-4">Toggle</h3>
          <button class="btn btn-primary mb-4" hd-click="${new JS().toggle({ to: "#bq2" })}">Toggle</button>
          <blockquote id="bq2" class="hint p-4 bg-gray-100 rounded">
            <p>JS Commands let you update the DOM without making a trip to the server.</p>
          </blockquote>
        </div>

        <hr class="my-8" />

        <div class="mb-12">
          <h3 class="text-xl font-semibold mb-4">Add/Remove Class</h3>
          <div class="flex gap-2 mb-4">
            <button class="btn btn-primary" hd-click="${new JS().add_class("bg-blue-200", { to: "#bq3" })}">
              Add "bg-blue-200"
            </button>
            <button class="btn btn-primary" hd-click="${new JS().add_class("bg-purple-200", { to: "#bq3" })}">
              Add "bg-purple-200"
            </button>
            <button
              class="btn btn-primary"
              hd-click="${new JS().remove_class("bg-blue-200 bg-purple-200", { to: "#bq3" })}">
              Remove all
            </button>
          </div>
          <blockquote id="bq3" class="p-4 bg-gray-100 rounded">
            <p>JS Commands let you update the DOM without making a trip to the server.</p>
          </blockquote>
        </div>

        <hr class="my-8" />

        <div class="mb-12">
          <h3 class="text-xl font-semibold mb-4">Dispatch</h3>
          <p class="mb-2">
            Dispatch lets you send custom javascript events on the client, which you can listen to using
            <code class="bg-gray-100 px-1 rounded">window.addEventListener</code>.
          </p>
          <p class="mb-2">This example sends a "copy-to-clipboard" event when the button is clicked.</p>
          <p class="mb-4">
            It also demonstrates how to chain multiple JS commands together - this example adds a class to the button
            when the copy-to-clipboard event is dispatched.
          </p>
          <pre id="copy-text" class="p-4 bg-gray-100 rounded mb-4">This will be copied to the clipboard</pre>

          <button
            id="copy-button"
            class="btn btn-primary"
            hd-click="${new JS()
              .dispatch("copy-to-clipboard", { to: "#copy-text" })
              .add_class("copied", { to: "#copy-button" })}">
            Copy to clipboard
          </button>
        </div>

        <hr class="my-8" />

        <div class="mb-12">
          <h3 class="text-xl font-semibold mb-4">Push</h3>
          <p class="mb-2">
            Push lets you push a new event to your view, similar to
            <code class="bg-gray-100 px-1 rounded">hd-click</code>.
          </p>
          <p class="mb-2">This example increments a counter when the button is clicked.</p>
          <p class="mb-4">
            This can be useful if you want to chain the push event with other JS commands, like a transition. This
            example uses the <code class="bg-gray-100 px-1 rounded">transition</code> command to add a bounce animation
            to the counter when it is incremented.
          </p>
          <p id="counter" class="p-4 bg-gray-100 rounded mb-4"><b>Counter</b> | <span>${this.value}</span></p>
          <button
            class="btn btn-primary"
            hd-click="${new JS().push("increment").transition("animate-bounce", { to: "#counter" })}">
            Increment
          </button>
        </div>

        <hr class="my-8" />

        <div class="mb-12">
          <h3 class="text-xl font-semibold mb-4">Focus</h3>
          <p class="mb-2">Focus lets you focus an element on the page.</p>
          <p class="mb-2">
            The first button uses <code class="bg-gray-100 px-1 rounded">focus({ to: "#email" })</code> to focus the
            email input.
          </p>
          <p class="mb-4">
            The second button uses
            <code class="bg-gray-100 px-1 rounded">focus_first({ to: "#focus-form" })</code> to focus the first input in
            the form.
          </p>

          <div class="flex gap-2 mb-4">
            <button class="btn btn-primary" hd-click="${new JS().focus({ to: "#email" })}">Focus</button>
            <button class="btn btn-primary" hd-click="${new JS().focus_first({ to: "#focus-form" })}">
              Focus first
            </button>
          </div>
          <form id="focus-form" class="space-y-4" autocomplete="off">
            <div>
              <label class="block mb-1" for="name">Name</label>
              <input class="input input-bordered" type="text" id="name" />
            </div>
            <div>
              <label class="block mb-1" for="email">Email</label>
              <input class="input input-bordered" type="text" id="email" />
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

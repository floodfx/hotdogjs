import { BaseView, html, type ViewContext } from "hotdogjs";

/**
 * Key events for the list view.
 */
type ListEvent = {
  type: "key_update";
  key: "j" | "k" | "x";
};

/**
 * ListView is a list view that has keyboard controls for navigation and selection.
 */
export default class ListView extends BaseView<ListEvent> {
  items = [
    { id: 1, text: "Mustard", selected: false },
    { id: 2, text: "Ketchup", selected: false },
    { id: 3, text: "Relish", selected: false },
    { id: 4, text: "Chili", selected: false },
    { id: 5, text: "Onions", selected: false },
    { id: 6, text: "Sauerkraut", selected: false },
  ];
  currentIndex = 0;

  handleEvent(ctx: ViewContext<ListEvent>, event: ListEvent): void | Promise<void> {
    switch (event.type) {
      case "key_update":
        switch (event.key) {
          case "j": // Move down
            this.currentIndex = Math.min(this.currentIndex + 1, this.items.length - 1);
            break;
          case "k": // Move up
            this.currentIndex = Math.max(this.currentIndex - 1, 0);
            break;
          case "x": // Toggle selection
            this.items[this.currentIndex].selected = !this.items[this.currentIndex].selected;
            break;
        }
        break;
    }
  }

  render() {
    return html`
      <div class="flex flex-col gap-2 justify-center max-w-screen-sm mx-auto">
        <div class="flex flex-col gap-2">
          <h2 class="text-md font-bold">Instructions</h2>
          <p>Use keys to navigate the list and toggle selection.</p>
        </div>
        <div class="flex flex-col gap-2">
          <div class="card bg-base-100 w-96 shadow-xl border border-gray-300">
            <div class="card-body">
              <h2 class="card-title">Toppings for your 🌭</h2>
              <div class="flex flex-col gap-2">
                ${this.items.map(
                  (item, index) => html`
                    <div
                      class="flex items-center gap-2 p-2 rounded ${index === this.currentIndex
                        ? "outline outline-2 outline-secondary"
                        : ""} ${item.selected ? "bg-primary bg-opacity-20" : ""}">
                      <input type="checkbox" class="checkbox" ${item.selected ? "checked" : ""} disabled />
                      <span>${item.text}</span>
                    </div>
                  `
                )}
              </div>
              <div class="card-actions flex flex-col justify-end pt-8">
                <div class="flex flex-col gap-2">
                  <h2 class="text-md font-bold">Keyboard Controls</h2>
                  <div class="flex flex-col gap-2 justify-center">
                    <div class="flex items-center gap-1">
                      <kbd hd-window-keydown="key_update" hd-key="j" class="kbd">j</kbd>
                      <span class="text-sm">= down</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <kbd hd-window-keydown="key_update" hd-key="k" class="kbd">k</kbd>
                      <span class="text-sm">= up</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <kbd hd-window-keydown="key_update" hd-key="x" class="kbd">x</kbd>
                      <span class="text-sm">= toggle selection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

import { BaseView, MountEvent, ViewContext, html } from "hotdogjs-core";
import { Form, ZodForm, error_tag, form_for, text_input } from "hotdogjs-form";
import { submit } from "tags/submit";
import BookDB, { Book, BookSchema } from "../../db/book_db";

type Events =
  | { type: "save"; name: string; author: string }
  | { type: "validate"; name: string; author: string }
  | { type: "toggle-checkout"; id: string }
  | { type: "book-change" };

export default class Books extends BaseView<Events> {
  _csrfToken: string = "";
  books: Book[] = [];
  form: Form<Book> = new ZodForm(BookSchema);

  mount(ctx: ViewContext<Events>, e: MountEvent): void | Promise<void> {
    if (ctx.connected) {
      ctx.subscribe("book-change");
    }
    this.books = BookDB.all();
    this._csrfToken = e._csrf_token;
  }

  async handleEvent(ctx: ViewContext<Events>, e: Events): Promise<void> {
    switch (e.type) {
      case "validate":
        this.form.update(e, e.type);
        break;
      case "save":
        this.form.update(e, e.type);
        if (this.form.valid) {
          const book = BookDB.insert(this.form.data);
          if (book) {
            this.books = [...this.books, book];
            this.form.reset();
            ctx.publish("book-change");
          }
        }
        break;
      case "toggle-checkout":
        const book = BookDB.update(e.id);
        if (book) {
          this.books = this.books.map((b) => {
            if (b.id === book.id) {
              return book;
            }
            return b;
          });
          ctx.publish("book-change");
        }
        break;
      case "book-change":
        this.books = BookDB.all();
        break;
    }
  }

  render() {
    return html`
      <h1>My Library</h1>
      
      <div id="bookForm">
        ${form_for<Book>("#", this._csrfToken, {
          phx_submit: "save",
          phx_change: "validate",
        })}
          
          <div class="field">
            ${text_input(this.form, "name", { placeholder: "Name", autocomplete: "off", phx_debounce: 1000 })}
            ${error_tag(this.form, "name")}
          </div>

          <div class="field">
            ${text_input(this.form, "author", { placeholder: "Author", autocomplete: "off", phx_debounce: 1000 })}
            ${error_tag(this.form, "author")}
          </div>

          ${submit("Add Book", { phx_disable_with: "Saving..." })}
        </form>
      </div>

      <div id="books">
        ${this.books.map(renderBook)}
      </div>
    `;
  }
}

function renderBook(b: Book) {
  const color = b.checked_out ? `color: #ccc;` : ``;
  const emoji = b.checked_out ? `📖[checked out]` : `📚[available]`;
  return html`
    <div id="${b.id}" style="margin-top: 1rem; ${color}">
      ${emoji} <span>${b.name}</span> by <span>${b.author}</span>
      <div>
        <button phx-click="toggle-checkout" phx-value-id="${b.id}" phx-disable-with="Updating...">
          ${b.checked_out ? "Return" : "Check Out"}
        </button>
      </div>
    </div>
  `;
}

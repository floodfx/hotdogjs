import { html, safe, type AnyEvent, type Template } from "hotdogjs";

/**
 * Options for the form tag.
 */
export interface FormOptions<T extends AnyEvent> {
  /**
   * The CSRF token to use for the form.
   */
  csrfToken?: string;
  /**
   * onSubmit is the event to send when the form is submitted.
   */
  onSubmit?: T["type"];
  /**
   * onChange is the event to send when the form is changed.
   */
  onChange?: T["type"];
  /**
   * The method to use for the form.
   */
  method?: "get" | "post";
  /**
   * The action to use for the form.
   */
  action?: string;
  /**
   * The classes to use for the form.
   */
  classes?: string;
  /**
   * The dom id to use for the form.
   */
  id?: string;
}

/**
 * form is a tag that creates a form element.
 *
 * @param options - The options for the form.
 * @param template - The template to embed in the form.
 * @returns The form `Template`.
 */
export const form = <T extends AnyEvent>(options?: FormOptions<T>, template?: Template): Template => {
  const { action, csrfToken, method, onSubmit, onChange, id, classes } = options ?? {};
  const cl = classes ? safe(` class="${classes}"`) : "";
  const m = method ? safe(` method="${method}"`) : "";
  const a = action ? safe(` action="${action}"`) : "";
  const s = onSubmit ? safe(` hd-submit="${onSubmit}"`) : "";
  const c = onChange ? safe(` hd-change="${onChange}"`) : "";
  const i = id ? safe(` id="${id}"`) : "";

  return html`
    <form ${i} ${a} ${m} ${cl} ${s} ${c}>
      ${/* automatically add a hidden csrf token input */ ""}
      ${csrfToken ? html`<input type="hidden" name="_csrf_token" value="${csrfToken}" />` : ""} ${template ?? ""}
    </form>
  `;
};

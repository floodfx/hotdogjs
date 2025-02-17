import { BaseComponent, html, safe, type Template } from "hotdogjs";
import type { Form } from "../form";

/**
 * Options for the input tag.
 */
export interface InputOptions {
  /**
   * The placeholder to use for the input.
   */
  placeholder?: string;
  /**
   * The autocomplete to use for the input.
   */
  autocomplete?: "off" | "on";
  /**
   * The debounce to use for the input.
   */
  debounce?: number | "blur" | "focus";
  /**
   * The type to use for the input.
   */
  type?: "text" | "tel" | "password";
  /**
   * The classes to use for the input.
   */
  classes?: string;
}

/**
 * text_input is a tag that creates a text input element `Template`.
 *
 * @param form - The form to use for the input.
 * @param key - The key to use for the input.
 * @param options - The options for the input.
 * @returns The text input `Template`.
 */
export const text_input = <T>(form: Form<T>, key: keyof T, options?: InputOptions): Template => {
  const placeholder = options?.placeholder ? safe(` placeholder="${options.placeholder}"`) : "";
  const autocomplete = options?.autocomplete ? safe(` autocomplete="${options.autocomplete}"`) : "";
  const debounce = options?.debounce ? safe(` hd-debounce="${options.debounce}"`) : "";
  const classes = options?.classes ? safe(` class="${options.classes}"`) : "";
  const type = options?.type ?? "text";
  const id = `input_${String(key)}`;
  const value = form.data[key] ?? "";
  return html`<input
    type="${type}"
    id="${id}"
    name="${String(key)}"
    value="${value}"
    ${classes}${autocomplete}${placeholder}${debounce} />`;
};

export class TextInput<T> extends BaseComponent {
  #form: Form<T>;
  #key: keyof T;
  #options?: InputOptions;

  constructor(id: string, form: Form<T>, key: keyof T, options?: InputOptions) {
    super();
    this.id = id;
    this.#form = form;
    this.#key = key;
    this.#options = options;
  }

  render() {
    return text_input(this.#form, this.#key, this.#options);
  }
}

interface TelephoneInputOptions extends Omit<InputOptions, "type"> {}

export const telephone_input = <T>(form: Form<T>, key: keyof T, options?: TelephoneInputOptions) => {
  return text_input(form, key, { ...options, type: "tel" });
};

interface ErrorTagOptions {
  className?: string;
}

export const error_tag = <T>(form: Form<T>, key: keyof T, options?: ErrorTagOptions) => {
  const error = form.errors ? form.errors[key] : undefined;
  if (!form.valid && error) {
    const className = options?.className ?? "text-sm text-error";
    return html`<span class="${className}" hd-feedback-for="${key}">${error}</span>`;
  }
  return html``;
};

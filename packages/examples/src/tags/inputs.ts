import { html, safe } from "hotdogjs-core";
import { Form } from "hotdogjs-form";

interface InputOptions {
  placeholder?: string;
  autocomplete?: "off" | "on";
  phx_debounce?: number | "blur" | "focus";
  type?: "text" | "tel";
  className?: string;
}

export const text_input = <T>(form: Form<T>, key: keyof T, options?: InputOptions) => {
  const placeholder = options?.placeholder ? safe(` placeholder="${options.placeholder}"`) : "";
  const autocomplete = options?.autocomplete ? safe(` autocomplete="${options.autocomplete}"`) : "";
  const phx_debounce = options?.phx_debounce ? safe(` phx-debounce="${options.phx_debounce}"`) : "";
  const className = options?.className ? safe(` class="${options.className}"`) : "";
  const type = options?.type ?? "text";
  const id = `input_${String(key)}`;
  const value = form.data[key] ?? "";
  // prettier-ignore
  return html`<input type="${type}" id="${id}" name="${String(key)}" value="${value}"${className}${autocomplete}${placeholder}${phx_debounce}/>`;
};

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
    const className = options?.className ?? "invalid-feedback";
    return html`<span class="${className}" phx-feedback-for="${key}">${error}</span>`;
  }
  return html``;
};

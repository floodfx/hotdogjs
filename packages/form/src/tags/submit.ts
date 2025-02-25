import { escapehtml, html, safe, type Template } from "hotdogjs";

/**
 * Options for the submit tag.
 */
export type SubmitOptions = Partial<HTMLButtonElement> & {
  /**
   * disable_with is the text to show when the button is disabled while waiting for the form to submit.
   */
  disable_with?: string;
  /**
   * disabled is whether the button is disabled.
   */
  disabled?: boolean;
  /**
   * classes is the css classes to add to the submit button.
   */
  classes?: string;
};

/**
 * submit is a tag that creates a submit button.
 *
 * @param label - The `string | Template` to use for the submit button.
 * @param options - The options for the submit button.
 * @returns The submit button `Template`.
 */
export const submit = (label: string | Template, options?: SubmitOptions): Template => {
  const attrs = Object.entries(options || {}).reduce((acc, [key, value]) => {
    if (key === "disabled") {
      acc += value ? safe(` disabled`) : "";
    } else if (key === "disable_with") {
      acc += safe(` hd-disable-with="${escapehtml(value)}"`);
    } else if (key === "classes") {
      acc += safe(` class="${escapehtml(value)}"`);
    } else {
      acc += safe(` ${key}="${escapehtml(value)}"`);
    }
    return acc;
  }, "");

  return html`<button type="submit" ${safe(attrs)}>${label}</button>`;
};

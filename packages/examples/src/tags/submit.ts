import { escapehtml, html, safe } from "hotdogjs";

interface SubmitOptions {
  phx_disable_with?: string;
  disabled?: boolean;
  classes?: string;
  [key: string]: string | number | boolean | undefined;
}

export function submit(label: string, options?: SubmitOptions) {
  const attrs = Object.entries(options || {}).reduce((acc, [key, value]) => {
    if (key === "disabled") {
      acc += value ? safe(` disabled`) : "";
    } else if (key === "phx_disable_with") {
      acc += safe(` hd-disable-with="${escapehtml(value)}"`);
    } else {
      acc += safe(` ${key}="${escapehtml(value)}"`);
    }
    return acc;
  }, "");
  // prettier-ignore
  return html`<button ${options?.classes ? safe(`class="${options?.classes}"`) : ""} type="submit"${safe(attrs)}>${label}</button>`;
}

import { html, safe, type Template } from "hotdogjs";

interface FormOptions {
  csrfToken?: string;
  submit?: string;
  change?: string;
  method?: "get" | "post";
  action?: string;
  classes?: string;
  id?: string;
}

export const form = (options?: FormOptions, template?: Template) => {
  const { action, csrfToken, method, submit, change, id, classes } = options ?? {};
  const cl = classes ? safe(` class="${classes}"`) : "";
  const m = method ? safe(` method="${method}"`) : "";
  const a = action ? safe(` action="${action}"`) : "";
  const s = submit ? safe(` hd-submit="${submit}"`) : "";
  const c = change ? safe(` hd-change="${change}"`) : "";
  const i = id ? safe(` id="${id}"`) : "";

  // prettier-ignore
  return html`
    <form ${i} ${a} ${m} ${cl} ${s} ${c}>
      <input type="hidden" name="_csrf_token" value="${csrfToken}" />
      ${template ?? ""}
    </form>
  `;
};

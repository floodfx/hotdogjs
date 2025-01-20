import { html, safe } from "hotdogjs";

interface FormForOptions {
  onSubmit?: string;
  onChange?: string;
  method?: "get" | "post";
  id?: string;
}

export const form_for = (action: string, csrfToken: string, options?: FormForOptions) => {
  const method = options?.method ?? "post";
  const submit = options?.onSubmit ? safe(` hd-submit="${options.onSubmit}"`) : "";
  const change = options?.onChange ? safe(` hd-change="${options.onChange}"`) : "";
  const id = options?.id ? safe(` id="${options.id}"`) : "";

  // prettier-ignore
  return html`
    <form${id} action="${action}" method="${method}"${submit}${change}>
      <input type="hidden" name="_csrf_token" value="${csrfToken}" />
  `;
};

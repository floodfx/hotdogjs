import { error_tag, form, submit, text_input, ZodForm, type Form, type InputOptions } from "@hotdogjs/form";
import { BaseComponent, BaseView, html, type RenderMeta, type ViewContext } from "hotdogjs";
import { Modal } from "src/components/modal";
import { z } from "zod";

/**
 * Zod-based schema for the registration form.
 */
const RegistrationSchema = z
  .object({
    email: z.string().email(),
    username: z.string().min(4),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // error will be shown on confirmPassword field
  });

/**
 * Inferred type for the registration form.
 */
type Registration = z.infer<typeof RegistrationSchema>;

/**
 * RegistrationEvents for the registration form.
 */
type RegistrationEvents =
  | ({
      type: "save";
    } & Registration)
  | ({
      type: "validate";
    } & Registration);

/**
 * Register shows how easy it is to get a working form with validation.
 */
export default class Register extends BaseView<RegistrationEvents> {
  form: Form<Registration> = new ZodForm(RegistrationSchema);
  modal: Modal = new Modal(1);

  handleEvent(ctx: ViewContext<RegistrationEvents>, e: RegistrationEvents): void {
    switch (e.type) {
      case "validate":
        this.form.update(e, e.type);
        break;
      case "save":
        this.form.update(e, e.type);
        if (this.form.valid) {
          // IRL would save to db here but for now just show a modal
          this.modal.body = html`<div class="flex flex-col gap-4">
            <h3 class="text-lg font-bold">Registration successful!</h3>
            <p>Welcome ${e.username}!</p>
            <p>Your email is ${e.email}.</p>
          </div>`;
          ctx.pushEvent(this.modal.showEvent);
          this.form.reset();
        }
        break;
    }
  }

  render(meta: RenderMeta) {
    return html`<div class="flex max-w-sm mx-auto shadow-lg border border-gray-200 rounded-lg p-6">
      <div class="flex flex-col gap-4 w-full">
        <h2 class="text-2xl">Form Example</h2>
        <p class="text-sm">
          This is an example of a form using the form component with built in validation.
        </p>
        <h1 class="text-xl font-bold pt-4">Register</h1>
        ${form<RegistrationEvents>(
          {
            onSubmit: "save",
            onChange: "validate",
            classes: "flex flex-col gap-4",
            csrfToken: meta.csrfToken,
          },
          html`
            ${new LabeledInput(this.form, "email", "ph-envelope", {
              placeholder: "Email",
              autocomplete: "on",
              debounce: "blur", // debounce for blur event
            })}
            ${new LabeledInput(this.form, "username", "ph-user", {
              placeholder: "Username",
              autocomplete: "off",
              debounce: 500, // debounce for 500ms
            })}
            ${new LabeledInput(this.form, "password", "ph-lock", {
              type: "password",
              placeholder: "Password",
              autocomplete: "off",
              debounce: "blur",
            })}
            ${new LabeledInput(this.form, "confirmPassword", "ph-lock", {
              type: "password",
              placeholder: "Confirm Password",
              autocomplete: "off",
              debounce: "blur",
            })}
            ${submit(html`Save <i class="ph ph-user-plus"></i>`, {
              classes: "btn btn-primary",
            })}
          `
        )}
      </div>
      ${this.modal}
    </div></div>`;
  }
}

/**
 * LabeledInput is a component that displays a label, input field, and error message.
 */
class LabeledInput<T extends object> extends BaseComponent {
  #icon: string;
  #inputOptions: InputOptions;
  #key: keyof T;
  #form: Form<T>;

  constructor(form: Form<T>, key: keyof T, icon: string, inputOptions: InputOptions) {
    super();
    this.#form = form;
    this.#key = key;
    this.#icon = icon;
    this.#inputOptions = inputOptions;
  }

  render() {
    return html`<label class="input input-bordered flex items-center gap-2">
        <i class="ph ${this.#icon}"></i>
        ${text_input(this.#form, this.#key, this.#inputOptions)}
      </label>
      ${error_tag(this.#form, this.#key)}`;
  }
}

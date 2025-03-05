import type { Form } from "@hotdogjs/form";
import { error_tag, form, text_input, ZodForm } from "@hotdogjs/form";
import { BaseView, html, type RenderMeta, type ViewContext } from "hotdogjs";
import qrcode from "qrcode";
import { z } from "zod";

const QRCodeSchema = z.object({
  url: z.string().url().min(1),
});

type QRCodeProps = z.infer<typeof QRCodeSchema>;

type QRCodeEvent = {
  type: "validate" | "save";
} & QRCodeProps;

export default class QRCode extends BaseView<QRCodeEvent> {
  form: Form<QRCodeEvent> = new ZodForm(QRCodeSchema);
  qrDataUrl?: string;

  async handleEvent(ctx: ViewContext<QRCodeEvent>, event: QRCodeEvent) {
    const { type: action } = event;
    switch (action) {
      case "validate":
        this.form.update(event, action);
        break;
      case "save":
        this.form.update(event, action);
        if (this.form.valid) {
          const qr = await qrcode.toDataURL(this.form.data.url!, {
            errorCorrectionLevel: "H",
            scale: 10,
            width: 500,
          });
          this.qrDataUrl = qr;
        }
    }
  }

  render(meta: RenderMeta) {
    return html`
      <div class="flex flex-col gap-2 justify-center max-w-screen-sm mx-auto">
        <h2 class="text-2xl font-bold">Create a QR Code</h2>
        ${form(
          {
            onChange: "validate",
            onSubmit: "save",
            csrfToken: meta.csrfToken,
          },
          html`
            <div class="flex flex-col gap-4">
              <label for="url" class="flex flex-col gap-2">
                <span>Enter Link for QR Code</span>
                ${text_input(this.form, "url", { classes: "input input-bordered" })} ${error_tag(this.form, "url")}
              </label>
              <button class="btn btn-primary" type="submit">Create</button>
            </div>
          `
        )}
        ${this.qrDataUrl
          ? html`
              <div class="flex flex-col gap-4">
                <img src="${this.qrDataUrl}" />
              </div>
            `
          : ""}
      </div>
    `;
  }
}

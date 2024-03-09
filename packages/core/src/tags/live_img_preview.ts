import { html } from "../template";
import type { UploadEntry } from "../ws/handler/uploadEntry";

export function live_img_preview(entry: UploadEntry) {
  const { ref, upload_ref } = entry;
  return html`
    <img
      id="phx-preview-${ref}"
      data-phx-upload-ref="${upload_ref}"
      data-phx-entry-ref="${ref}"
      data-phx-hook="Phoenix.LiveImgPreview"
      data-phx-update="ignore" />
  `;
}

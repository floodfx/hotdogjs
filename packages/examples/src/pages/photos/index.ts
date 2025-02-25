import { Form, ZodForm, form, submit } from "@hotdogjs/form";
import {
  BaseView,
  MountEvent,
  RenderMeta,
  UploadEntry,
  ViewContext,
  html,
  live_file_input,
  live_img_preview,
  type UploadConfigOptions,
} from "hotdogjs";
import PhotoDB, { PhotoSchema, type Photo } from "../../db/photo_db";

export type PhotosEvents =
  | ({ type: "validate" | "save" } & Partial<Photo>)
  | { type: "toggle-favorite"; id: string }
  | { type: "cancel"; config_name: string; ref: string }
  | { type: "photo-change" };

export const defaultPhotosConfigOptions: UploadConfigOptions = {
  accept: [".png", ".jpg", ".jpeg", ".gif"], // only allow images
  max_entries: 3, // only 3 entries per upload
  max_file_size: 5 * 1024 * 1024, // 5MB
};

export default class Photos extends BaseView<PhotosEvents> {
  photos: Photo[] = [];
  form: Form<Photo> = new ZodForm(PhotoSchema);
  uploadConfigId: string = "photos";
  uploadConfigOptions: UploadConfigOptions = defaultPhotosConfigOptions;

  constructor(options: { uploadConfigOptions?: UploadConfigOptions } = {}) {
    super();
    this.uploadConfigOptions = options.uploadConfigOptions ?? defaultPhotosConfigOptions;
  }

  mount(ctx: ViewContext<PhotosEvents>, e: MountEvent): void | Promise<void> {
    if (ctx.connected) {
      ctx.subscribe("photo-change");
    }
    this.photos = PhotoDB.all();
    // configure the upload constraints
    ctx.allowUpload(this.uploadConfigId, this.uploadConfigOptions);
  }

  handleEvent(ctx: ViewContext<PhotosEvents>, event: PhotosEvents) {
    switch (event.type) {
      case "validate": {
        this.form.update(event, event.type);
        break;
      }
      case "save": {
        // get the completed file uploads
        const { completed } = ctx.uploadedEntries(this.uploadConfigId);

        // (optional) preprocess the image, validate it, create a thumbnail, etc.
        completed.forEach((entry: UploadEntry) => {});

        // consume (i.e. remove) the uploaded entries from the "photos" upload config
        ctx.consumeUploadedEntries(this.uploadConfigId, async (path, entry) => {
          const photo = PhotoDB.insert({
            id: entry.uuid,
            external: false,
            mime: entry.type,
            data: entry.data as unknown as Uint8Array,
            favorite: false,
          });
          if (photo) {
            this.photos = [...this.photos, photo];
          }
        });
        this.form.reset();
        ctx.publish("photo-change");
        break;
      }
      case "cancel": {
        ctx.cancelUpload(this.uploadConfigId, event.ref);
        break;
      }
      case "toggle-favorite": {
        PhotoDB.update(event.id);
        this.photos = PhotoDB.all();
        ctx.publish("photo-change");
        break;
      }
      case "photo-change":
        this.photos = PhotoDB.all();
        break;
    }
  }

  render(meta: RenderMeta) {
    const { uploads } = meta;
    const uploadconfig = uploads[this.uploadConfigId];
    return html`
      <div class="flex flex-col items-center">
        <h2 class="text-2xl font-bold">Photo Gallery</h2>

        <!-- Render the form -->
        ${form(
          {
            id: "photo-form",
            onChange: "validate",
            onSubmit: "save",
            csrfToken: meta.csrfToken,
          },
          html`
            <div class="flex flex-col items-center">
              <!-- file input / drag and drop -->
              <div
                hd-drop-target="${uploadconfig.ref}"
                class="flex flex-col items-center justify-center border-2 border-gray-300 border-dashed rounded-lg p-10 m-4">
                ${live_file_input(uploadconfig, "file-input file-input-bordered w-full max-w-xs")} or drag and drop
                files here
              </div>
              <div class="text-sm text-gray-500 text-xs pb-3">
                Add up to ${uploadconfig.max_entries} photos (max ${uploadconfig.max_file_size / (1024 * 1024)} MB each)
              </div>
            </div>

            <!-- any errors from the upload -->
            ${uploadconfig.errors.length > 0
              ? html`
                  <div class="flex flex-col items-center justify-center">
                    <h3 class="text-red-500 text-sm mt-2">Please fix the errors below before uploading</h3>
                    ${uploadconfig.errors.map((error) => html`<p class="text-red-500 text-sm mt-2">${error}</p>`)}
                  </div>
                `
              : ""}

            <!-- render the preview, progress, and cancel button of the selected files -->
            ${uploadconfig.entries.map(previewUpload)}

            <!-- submit button -->
            <div class="flex justify-center">
              ${submit("Upload", {
                classes: "btn btn-primary btn-wide",
                disable_with: "Saving...",
                disabled: uploadconfig.errors.length > 0 || uploadconfig.entries.length === 0,
              })}
            </div>
          `
        )}

        <!-- photo grid -->
        <div class="flex justify-center">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl p-4">
            ${this.photos.map(renderPhoto)}
          </div>
        </div>
      </div>
    `;
  }
}

// Render a preview of the uploaded file with progress bar and cancel button
function previewUpload(entry: UploadEntry) {
  return html`
    <div
      id="${entry.ref}"
      class="flex flex-col md:flex-row items-center bg-gray-50 rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div
        class="w-full md:w-64 h-48 overflow-hidden rounded-lg shadow-inner bg-gray-200 flex items-center justify-center">
        ${live_img_preview(entry)}
      </div>
      <div class="flex-1 px-4 py-2 w-full">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-gray-700 truncate max-w-xs">${entry.name}</span>
          <span class="text-sm text-gray-500">${(entry.size / 1024).toFixed(1)} KB</span>
        </div>
        <div class="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-300"
            style="width: ${entry.progress}%"></div>
        </div>
        <div class="flex items-center justify-between mt-2">
          <span class="text-sm text-gray-600">${entry.progress}% complete</span>
          <button
            type="button"
            class="text-red-500 hover:text-red-700 transition-colors duration-200 focus:outline-none"
            hd-click="cancel"
            hd-value-ref="${entry.ref}"
            hd-value-config_name="photos"
            title="Cancel upload">
            <i class="ph ph-trash"></i>
          </button>
        </div>
        ${entry.errors?.map((error) => html`<p class="text-red-500 text-sm mt-2">${error}</p>`)}
      </div>
    </div>
  `;
}

// Render a photo with adaptive sizing based on orientation
function renderPhoto(photo: Photo) {
  const url = photo.external ? photo.url : `data:${photo.mime};base64,${Buffer.from(photo.data!).toString("base64")}`;
  return html`
    <div id="${photo.id}" class="mb-4 break-inside-avoid">
      <div class="relative group overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
        <img
          class="w-full h-auto object-cover"
          src="${url}"
          loading="lazy"
          onload="this.parentElement.classList.add(this.naturalHeight > this.naturalWidth ? 'portrait' : 'landscape')" />
        <div
          class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity duration-300"></div>
        <button
          class="absolute bottom-2 left-2 transition-opacity opacity-90 hover:opacity-100"
          hd-click="toggle-favorite"
          hd-value-id="${photo.id}"
          hd-disable-with="Updating...">
          ${photo.favorite ? "❤️" : "🤍"}
        </button>
      </div>
    </div>
  `;
}

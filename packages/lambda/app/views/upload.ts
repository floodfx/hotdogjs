import { Form, ZodForm, form_for, submit } from "@hotdogjs/form";
import {
  BaseView,
  MountEvent,
  RenderMeta,
  S3SignFormUpload,
  UploadEntry,
  ViewContext,
  html,
  live_file_input,
  live_img_preview,
  safe,
  type ExternalMetadata,
  type ExternalParams,
} from "hotdogjs";
import PhotoDB, { PhotoSchema, type Photo } from "../db/photo_db";

type PhotosEvents =
  | ({ type: "validate" } & Partial<Photo>)
  | ({ type: "save" } & Partial<Photo>)
  | { type: "toggle-favorite"; id: string }
  | { type: "cancel"; config_name: string; ref: string }
  | { type: "photo-change" };

const bucket = "hotdogjs-uploads";
const s3_url = `https://${bucket}.s3.amazonaws.com`;
const region = process.env.AWS_REGION ?? "us-west-2";

async function presignUpload(entry: ExternalParams): Promise<ExternalMetadata> {
  console.log("Presigning upload", entry);
  const fields = await S3SignFormUpload({
    bucket,
    acl: "public-read",
    key: `${entry.uuid}/${entry.name}`,
    contentType: entry.type,
    expiresSeconds: 60 * 60, // 1 hour
    maxFileSize: 5 * 1024 * 1024, // 5MB
    region,
  });
  return {
    uploader: "S3" as const,
    key: entry.name,
    url: s3_url,
    fields,
  };
}

export default class Photos extends BaseView<PhotosEvents> {
  _csrfToken: string = "";
  photos: Photo[] = [];
  form: Form<Photo> = new ZodForm(PhotoSchema);

  mount(ctx: ViewContext<PhotosEvents>, e: MountEvent): void | Promise<void> {
    if (ctx.connected) {
      ctx.subscribe("photo-change");
    }
    this.photos = PhotoDB.all();
    this._csrfToken = e._csrf_token;
    // configure the upload constraints
    ctx.allowUpload("photos", {
      accept: [".png", ".jpg", ".jpeg", ".gif"], // only allow images
      max_entries: 3, // only 3 entries per upload
      max_file_size: 5 * 1024 * 1024, // 5MB
      external: presignUpload,
    });
  }

  handleEvent(ctx: ViewContext<PhotosEvents>, event: PhotosEvents): void | Promise<void> {
    switch (event.type) {
      case "validate": {
        this.form.update(event, event.type);
        break;
      }
      case "save": {
        // first get the completed file uploads and map them to urls
        // Note: the files are guaranteed to be completed here because
        // save is the event called after all the uploads are complete
        const { completed } = ctx.uploadedEntries("photos");

        // save the photos
        completed.forEach((entry: UploadEntry) => {
          console.log("Completed entry", entry);
          const photo = PhotoDB.insert({
            id: entry.uuid,
            mime: entry.type,
            external: true,
            url: `${s3_url}/${entry.uuid}/${entry.name}`,
            favorite: false,
          });
          if (photo) {
            this.photos = [...this.photos, photo];
          }
        });

        // Yay! We've successfully saved the photo, so we can consume (i.e. "remove")
        // the uploaded entries from the "photos" upload config
        ctx.consumeUploadedEntries("photos", async (path, entry) => {
          console.log("Consuming entry", path, entry);
          // we could create thumbnails, scan for viruses, etc.
          // but for now move the data from the temp file (meta.path) to a public directory
          // e.g. createThumbail(entry);
        });
        // update the context with new photos and clear the form
        this.form.reset();
        break;
      }
      case "cancel": {
        ctx.cancelUpload("photos", event.ref);
        break;
      }
      case "toggle-favorite": {
        const photo = PhotoDB.update(event.id);
        if (photo) {
          this.photos = this.photos.map((p) => {
            if (p.id === photo.id) {
              return photo;
            }
            return p;
          });
          ctx.publish("photo-change");
        }
        break;
      }
      case "photo-change":
        this.photos = PhotoDB.all();
        break;
    }
  }

  render(meta: RenderMeta<PhotosEvents>) {
    const { uploads } = meta;
    return html`
      <h2>My Photo Groups</h2>

      <!-- Render the form -->
      ${safe(
        form_for("#", this._csrfToken, {
          id: "photo-form",
          onChange: "validate",
          onSubmit: "save",
        })
      )}

        <div>
          <!-- file input / drag and drop -->
          <div hd-drop-target="${uploads.photos.ref}" style="border: 2px dashed #ccc; padding: 10px; margin: 10px 0;">
            ${live_file_input(uploads.photos, "file-input file-input-bordered w-full max-w-xs")}
            or drag and drop files here
          </div>
          <!-- help text -->
          <div style="font-size: 10px; padding-bottom: 3rem">
            Add up to ${uploads.photos.max_entries} photos
            (max ${uploads.photos.max_file_size / (1024 * 1024)} MB each)
          </div>
        </div>

        <!-- any errors from the upload -->
        ${uploads.photos.errors.map((error: string) => html`<p class="invalid-feedback">${error}</p>`)}

        <!-- render the preview, progress, and cancel button of the selected files -->
        ${uploads.photos.entries.map(renderEntry)}

        <!-- submit button -->
        ${safe(
          submit("Upload", {
            classes: "btn btn-primary",
            phx_disable_with: "Saving...",
            disabled: uploads.photos.errors.length > 0,
          })
        )}
      </form>

      <!-- render the photos  -->
      <ul id="photo_groups_list" hd-update="prepend">
        ${this.photos.map(renderPhoto)}
      </ul>
    `;
  }
}

// Render a preview of the uploaded file with progress bar and cancel button
function renderEntry(entry: UploadEntry) {
  return html`
    <div style="display: flex; align-items: center;">
      <div style="width: 250px; margin: 2rem 0;">${live_img_preview(entry)}</div>
      <div style="display: flex; align-items: center; margin-left: 2rem;">
        <progress
          style="position: relative; top: 8px; width: 150px; height: 1em;"
          value="${entry.progress}"
          max="100"></progress>
        <span style="margin-left: 1rem;">${entry.progress}%</span>
      </div>
      <div style="display: flex; align-items: center;">
        <a style="padding-left: 2rem;" hd-click="cancel" hd-value-ref="${entry.ref}">🗑</a>
        ${entry.errors?.map((error) => html`<p style="padding-left: 1rem;" class="invalid-feedback">${error}</p>`)}
      </div>
    </div>
  `;
}

// Render a photo group with a list of photos
function renderPhoto(photo: Photo) {
  return html`<li id="${photo.id}">
    <div class="relative flex">
      <img class="object-cover h-48 w-96" src="${photo.url}" />
      <button
        class="absolute bottom-2 left-2"
        hd-click="toggle-favorite"
        hd-value-id="${photo.id}"
        hd-disable-with="Updating...">
        ${photo.favorite ? "❤️" : "🤍"}
      </button>
    </div>
  </li>`;
}

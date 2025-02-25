import {
  RenderMeta,
  S3SignFormUpload,
  UploadEntry,
  ViewContext,
  type ExternalMetadata,
  type ExternalParams,
  type UploadConfigOptions,
} from "hotdogjs";
import Photos, { defaultPhotosConfigOptions, type PhotosEvents } from ".";
import PhotoDB from "../../db/photo_db";

const bucket = "hotdogjs-uploads";
const s3_url = `https://${bucket}.s3.amazonaws.com`;
const region = process.env.AWS_REGION ?? "us-west-2";

async function presignUpload(entry: ExternalParams): Promise<ExternalMetadata> {
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

const s3UploadConfigOptions: UploadConfigOptions = {
  ...defaultPhotosConfigOptions,
  external: presignUpload,
};

export default class S3Photos extends Photos {
  constructor() {
    super({ uploadConfigOptions: s3UploadConfigOptions });
  }

  handleEvent(ctx: ViewContext<PhotosEvents>, event: PhotosEvents): void | Promise<void> {
    switch (event.type) {
      case "save": {
        const { completed } = ctx.uploadedEntries(this.uploadConfigId);

        completed.forEach((entry: UploadEntry) => {});

        ctx.consumeUploadedEntries(this.uploadConfigId, async (path, entry) => {
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
        this.form.reset();
        ctx.publish("photo-change");
        break;
      }
      default:
        super.handleEvent(ctx, event);
    }
  }

  render(meta: RenderMeta) {
    return super.render(meta);
  }
}

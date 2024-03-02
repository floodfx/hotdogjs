import { MatchedRoute } from "bun";
import { UploadConfig } from "ws/handler/uploadConfig";
import { Template, templateFromString } from "../template";
import { ViewContext } from "./context";

export interface ViewEvent {
  type: string;
}
export interface AnyEvent extends ViewEvent {
  [key: string]: any;
}
export interface AnyPushEvent extends AnyEvent {}

export interface MountEvent extends ViewEvent {
  type: "mount";
  _csrf_token: string;
  _mounts: number;
  query: MatchedRoute["query"];
  params: MatchedRoute["params"];
}

export interface RenderMeta {
  readonly csrfToken: string;
  readonly uploads: { [key: string]: UploadConfig };
}

export interface View<E extends ViewEvent> {
  mount(ctx: ViewContext<E>, e: MountEvent): void | Promise<void>;
  handleParams(ctx: ViewContext<E>, url: URL): void | Promise<void>;
  handleEvent(ctx: ViewContext<E>, event: E): void | Promise<void>;
  render(meta: RenderMeta): Template | Promise<Template>;
  shutdown(): void | Promise<void>;
}

export abstract class BaseView<E extends ViewEvent> implements View<E> {
  mount(ctx: ViewContext<E>, e: MountEvent): void | Promise<void> {
    // noop
  }
  handleParams(ctx: ViewContext<E>, url: URL): void | Promise<void> {
    // noop
  }
  handleEvent(ctx: ViewContext<E>, event: E): void | Promise<void> {
    throw new Error("Override handleEvent in your View to handle events");
  }
  shutdown(): void | Promise<void> {
    // noop
  }
  async renderFile(im: ImportMeta, filename?: string) {
    // drop file extension of current file and add .html
    const htmlFile = filename ?? im.file.replace(/\.[^/.]+$/, "") + ".html";
    const htmlTemplate = await Bun.file(im.dir + "/" + htmlFile).text();
    if (!htmlTemplate) {
      throw new Error("missing html template");
    }
    return templateFromString(htmlTemplate, this);
  }

  abstract render(meta: RenderMeta): Template | Promise<Template>;
}

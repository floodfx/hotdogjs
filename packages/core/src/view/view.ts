import { MatchedRoute } from "bun";
import { URL } from "node:url";
import { type Component } from "../component/component";
import { Template, templateFromString } from "../template";
import { UploadConfig } from "../ws/handler/uploadConfig";
import { ViewContext } from "./context";

/**
 * All ViewEvents must have a type property and can have any other properties.
 */
export interface ViewEvent {
  type: string;
}

/**
 * AnyEvent is a type that represents any event that can be sent to a View.
 */
export interface AnyEvent extends ViewEvent {
  [key: string]: any;
}

/**
 * AnyPushEvent is a type that represents any event that can be sent to a View.
 */
export interface AnyPushEvent extends AnyEvent {}

/**
 * MountEvent is the event that is sent to the View when it is mounted.
 */
export type MountEvent<T extends object = {}> = {
  /**
   * always "mount"
   */
  type: "mount";

  /**
   * the csrf token for the request
   */
  _csrf_token: string;

  /**
   * the number of mounts for the view
   */
  _mounts: number;

  /**
   * the query parameters from the URL
   */
  query: MatchedRoute["query"];

  /**
   * the matched route parameters
   */
  params: MatchedRoute["params"];
} & T;

/**
 * Meta data passed to the render function of a View with additional
 * information sometimes needed for rendering.
 */
export interface RenderMeta<E extends AnyEvent> {
  /**
   * The csrf token for the request, useful for passing along to forms
   * to prevent CSRF attacks.
   */
  readonly csrfToken: string;

  /**
   * The upload configurations for the view.  This is useful for
   * handing uploads in the view.
   */
  readonly uploads: { [key: string]: UploadConfig };

  /**
   * Helper method to rendering a `Component` in the `View.render` method.
   * @param c  the `Component` to render
   * @returns a `Template` that represents the `Component` in the `View.render`
   */
  component: (c: Component<E, Template>) => Template;
}

/**
 * A `View` is the basic building block for a web page that responds to
 * events and renders HTML. `View`s are initially rendered as HTML and then
 * connect via a websocket to the server.  Once connected, the `View` can
 * receive events from the client and/or server and update the HTML by sending
 * efficient DOM patches to the client.  You should extend `BaseView` to create
 * your own `View`.
 */
export interface View<E extends ViewEvent, RenderResult> {
  /**
   * `mount` is called when the `View` is mounted.  This method is called
   * exactly once when the `View` is first rendered.  It is useful for
   * setting up initial state based on request parameters and/or loading
   * data from the server.
   *
   * @param ctx the `ViewContext` helper
   * @param e the `MountEvent` that is sent to the `View` upon mount
   */
  mount(ctx: ViewContext<E>, e: MountEvent): void | Promise<void>;

  /**
   * `handleParams` is called when the URL changes and the `View` is already mounted.
   * This method is useful for updating the state of the `View` based on the new URL
   * including the query parameters and/or route parameters.
   *
   * @param ctx the `ViewContext` helper
   * @param url the new URL
   */
  handleParams(ctx: ViewContext<E>, url: URL): void | Promise<void>;

  /**
   * `handleEvent` is called when an event is sent to the `View`.  This method is
   * useful for updating the state of the `View` based on the event and is the
   * main way to handle user interactions or server-based events with the `View`.
   *
   * @param ctx the `ViewContext` helper
   * @param event the event that was sent to the `View`
   */
  handleEvent(ctx: ViewContext<E>, event: E): void | Promise<void>;

  /**
   * `render` is called to render the `View` a `Template`.  This method is called
   * automatically when the `View` is first rendered and then again when the
   * `View` updates its state via `handleEvent` or `handleParams`.
   *
   * @param meta the `RenderMeta` that is passed to the `View` when rendering
   */
  render(meta: RenderMeta<E>): RenderResult | Promise<RenderResult>;

  /**
   * `shutdown` is called when the `View` is being shutdown / unmounted.  This method is useful
   * for cleaning up any resources that the `View` may have allocated.
   */
  shutdown(): void | Promise<void>;
}

/**
 * `BaseView` is the base class for creating a `View`.  You should extend `BaseView` to create
 * your own `View`.
 */
export abstract class BaseView<E extends ViewEvent> implements View<E, Template> {
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

  /**
   * Helper method to render a file as a template.  This is useful for rendering
   * a file as a template in a `View`.
   * @param im the `ImportMeta` of the current file for resolving the file
   * @param filename the filename to render as a template, defaults to the current file with .html extension replacing the current file extension
   * @returns a `Template` that represents the file as a template
   */
  async renderFile(im: ImportMeta, filename?: string) {
    // drop file extension of current file and add .html
    const htmlFile = filename ?? im.file.replace(/\.[^/.]+$/, "") + ".html";
    const htmlTemplate = await Bun.file(im.dir + "/" + htmlFile).text();
    if (!htmlTemplate) {
      throw new Error("missing html template");
    }
    return templateFromString(htmlTemplate, this);
  }

  abstract render(meta: RenderMeta<E>): Template | Promise<Template>;
}

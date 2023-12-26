import { ServerWebSocket } from "bun";
import { Tree } from "template";
import { WsHandler } from "ws/handler";
import { UploadConfig } from "ws/handler/uploadConfig";
import { AnyEvent, AnyPushEvent, View, ViewEvent } from "./view";

export type Event<E extends ViewEvent> = E["type"] | E;

/**
 * Main interface to update state, interact, message, and otherwise
 * manage the lifecycle of a `LiveView`.
 *
 * The `LiveView` API (i.e. `mount`, `handleParams`, `handleInfo`, `handleEvent`)
 * are all passed `LiveViewSocket` which provide access to the current `LiveView`
 * context (via `context`) as well as various methods update the `LiveView` including
 * `assign` which updates the `LiveView`'s context (i.e. state).
 */
export interface ViewContext<E extends ViewEvent> {
  /**
   * The id of the `LiveView`
   */
  readonly id: string;
  /**
   * Whether the websocket is connected.
   * true if connected to a websocket, false for http request
   */
  readonly connected: boolean;
  /**
   * The current URL of the `LiveView`
   */
  readonly url: URL;
  /**
   * Updates the `<title>` tag of the `LiveView` page.  Requires using the
   * `live_title` helper in rendering the page.
   *
   * @param newPageTitle the new text value of the page - note the prefix and suffix will not be changed
   */
  pageTitle: string;
  /**
   * Pushes and event (possibly with data) from the server to the client.  Requires
   * either a `window.addEventListener` defined for that event or a client `Hook`
   * to be defined and to be listening for the event via `this.handleEvent` callback.
   *
   * @param pushEvent the event to push to the client
   */
  pushEvent(pushEvent: AnyPushEvent): void;
  /**
   * Updates the LiveView's browser URL with the given path and query parameters.
   *
   * @param path the path whose query params are being updated
   * @param params the query params to update the path with
   * @param replaceHistory whether to replace the current history entry or push a new one (defaults to false)
   */
  pushPatch(path: string, params?: URLSearchParams, replaceHistory?: boolean): void;
  /**
   * Shutdowns the current `LiveView`and loads another `LiveView`in its place
   * without reloading the whole page (i.e. making a full HTTP request).  Can be
   * used to remount the current `LiveView`if need be. Use `pushPatch` to update the
   * current `LiveView`without unloading and remounting.
   *
   * @param path the path whose query params are being updated
   * @param params the query params to update the path with
   * @param replaceHistory whether to replace the current history entry or push a new one (defaults to false)
   */
  pushRedirect(path: string, params?: URLSearchParams, replaceHistory?: boolean): void;
  /**
   * Send an internal event (a.k.a "Info") to the LiveView's `handleInfo` method
   *
   * @param event the event to send to `handleInfo`
   */
  dispatchEvent(event: Event<E>): void | Promise<void>;
  /**
   * Subscribe to the given topic using pub/sub. Events published to this topic
   * will be delivered to `handleInfo`.
   *
   * @param topic the topic to subscribe this `LiveView`to
   */
  subscribe(event: E["type"]): void | Promise<void>;
  publish(event: AnyEvent): void | Promise<void>;
  // /**
  //  * Allows file uploads for the given `LiveView`and configures the upload
  //  * options (filetypes, size, etc).
  //  * @param name the name of the upload
  //  * @param options the options for the upload (optional)
  //  */
  // allowUpload(name: string, options?: UploadConfigOptions): Promise<void>;
  // /**
  //  * Cancels the file upload for a given UploadConfig by config name and file ref.
  //  * @param name the name of the upload from which to cancel
  //  * @param ref the ref of the upload entry to cancel
  //  */
  // cancelUpload(configName: string, ref: string): Promise<void>;
  // /**
  //  * Consume the uploaded files for a given UploadConfig (by name). This
  //  * should only be called after the form's "save" event has occurred which
  //  * guarantees all the files for the upload have been fully uploaded.
  //  * @param name the name of the upload from which to consume
  //  * @param fn the callback to run for each entry
  //  * @returns an array of promises based on the return type of the callback function
  //  * @throws if any of the entries are not fully uploaded (i.e. completed)
  //  */
  // consumeUploadedEntries<T>(
  //   configName: string,
  //   fn: (meta: ConsumeUploadedEntriesMeta, entry: UploadEntry) => Promise<T>
  // ): Promise<T[]>;
  // /**
  //  * Returns two sets of files that are being uploaded, those `completed` and
  //  * those `inProgress` for a given UploadConfig (by name).  Unlike `consumeUploadedEntries`,
  //  * this does not require the form's "save" event to have occurred and will not
  //  * throw if any of the entries are not fully uploaded.
  //  * @param name the name of the upload from which to get the entries
  //  * @returns an object with `completed` and `inProgress` entries
  //  */
  // uploadedEntries(configName: string): Promise<{
  //   completed: UploadEntry[];
  //   inProgress: UploadEntry[];
  // }>;
}

type ViewContextParams<T> = {
  id: string;
  url: URL;
  view: View<AnyEvent>;
  ws: ServerWebSocket<T>;
  wsHandler: WsHandler<T>;
};

export class PlaceholderViewContext implements ViewContext<any> {
  get id() {
    return "";
  }
  get connected() {
    return false;
  }
  get url() {
    return new URL("https://example.com");
  }
  pageTitle: string = "";
  pushEvent(pushEvent: AnyPushEvent): void {
    throw new Error("Method not implemented.");
  }
  pushPatch(path: string, params?: URLSearchParams | undefined, replaceHistory?: boolean | undefined): void {
    throw new Error("Method not implemented.");
  }
  pushRedirect(path: string, params?: URLSearchParams | undefined, replaceHistory?: boolean | undefined): void {
    throw new Error("Method not implemented.");
  }
  dispatchEvent(event: any): void | Promise<void> {
    throw new Error("Method not implemented.");
  }
  subscribe(event: any): void | Promise<void> {
    throw new Error("Method not implemented.");
  }
  publish(event: AnyEvent): void | Promise<void> {
    throw new Error("Method not implemented.");
  }
}

export class HttpViewContext<E extends ViewEvent = AnyEvent> implements ViewContext<E> {
  #id: string;
  #url: URL;
  #redirect: { to: string; replace: boolean } | undefined;

  constructor(id: string, url: URL) {
    this.#id = id;
    this.#url = url;
  }

  get redirect(): { to: string; replace: boolean } | undefined {
    return this.#redirect;
  }

  get id(): string {
    return this.#id;
  }
  get connected(): boolean {
    return false;
  }
  get url(): URL {
    return this.#url;
  }
  set pageTitle(newPageTitle: string) {
    // noop
  }
  pushEvent(pushEvent: AnyPushEvent) {
    // noop
  }
  pushPatch(path: string, params?: URLSearchParams, replaceHistory?: boolean) {
    // noop
  }
  pushRedirect(path: string, params?: URLSearchParams, replaceHistory?: boolean) {
    const to = params ? `${path}?${params}` : path;
    this.#redirect = {
      to,
      replace: replaceHistory ?? false,
    };
  }
  subscribe(eventType: E["type"]) {
    // noop
  }
  dispatchEvent(event: E): void | Promise<void> {
    // noop
  }
  publish(event: AnyEvent): void | Promise<void> {
    // noop
  }
  // allowUpload(name: string, options?: UploadConfigOptions): Promise<void> {
  //   // no-op
  //   // istanbul ignore next
  //   return Promise.resolve();
  // }
  // cancelUpload(configName: string, ref: string): Promise<void> {
  //   // no-op
  //   // istanbul ignore next
  //   return Promise.resolve();
  // }
  // consumeUploadedEntries<T>(
  //   configName: string,
  //   fn: (meta: ConsumeUploadedEntriesMeta, entry: UploadEntry) => Promise<T>
  // ): Promise<T[]> {
  //   // no-op
  //   // istanbul ignore next
  //   return Promise.resolve([]);
  // }
  // uploadedEntries(configName: string): Promise<{ completed: UploadEntry[]; inProgress: UploadEntry[] }> {
  //   // no-op
  //   // istanbul ignore next
  //   return Promise.resolve({ completed: [], inProgress: [] });
  // }
}

export class WsViewContext<E extends ViewEvent = AnyEvent> implements ViewContext<E> {
  #liveView: View<AnyEvent>;
  url: URL;
  #id: string;
  #csrfToken: string;
  #pageTitle?: string;
  #pageTitleChanged: boolean = false;
  // #flash: FlashAdaptor;
  // #sessionData: SessionData;
  // components: LiveComponentsContext;
  pushEvents: AnyPushEvent[] = [];
  activeUploadRef: string | null = null;
  uploadConfigs: { [key: string]: UploadConfig } = {};
  parts: Tree = {};

  #ws: ServerWebSocket<any>;
  #wsHandler: WsHandler<any>;

  constructor(
    id: string,
    url: URL,
    view: View<AnyEvent>,
    csrfToken: string,
    ws: ServerWebSocket<any>,
    wsHandler: WsHandler<any>,
    // sessionData: SessionData,
    // flash: FlashAdaptor,
    onSendInfo: (event: Event<AnyEvent>) => void,
    onPushEvent: (event: AnyPushEvent) => void
  ) {
    this.url = url;
    this.#liveView = view;
    this.#id = id;
    this.#csrfToken = csrfToken;
    this.#ws = ws;
    this.#wsHandler = wsHandler;
    // this.#sessionData = sessionData;
    // this.#flash = flash;
    // this.components = new LiveComponentsContext(joinId, onSendInfo, onPushEvent);
  }

  get id(): string {
    return this.#id;
  }
  get connected(): boolean {
    return this.#ws.readyState === 1;
  }

  set pageTitle(newTitle: string) {
    if (this.#pageTitle !== newTitle) {
      this.#pageTitle = newTitle;
      this.#pageTitleChanged = true;
    }
  }
  pushEvent(pushEvent: AnyPushEvent): void {
    this.#wsHandler.handlePushEvent(pushEvent);
  }
  pushPatch(path: string, params?: URLSearchParams | undefined, replaceHistory?: boolean | undefined): void {
    this.#wsHandler.pushNav("live_patch", path, params, replaceHistory);
  }
  pushRedirect(path: string, params?: URLSearchParams | undefined, replaceHistory?: boolean | undefined): void {
    this.#wsHandler.pushNav("live_redirect", path, params, replaceHistory);
  }
  dispatchEvent(event: Event<E>) {
    if (this.connected) {
      return this.#wsHandler.handleSendInfo(event);
    }
  }
  subscribe(event: E["type"]): void | Promise<void> {
    if (this.connected) {
      this.#ws.subscribe(event);
    }
  }
  publish(event: AnyEvent): void | Promise<void> {
    if (this.connected) {
      this.#ws.publish(event.type, JSON.stringify(event), false);
    }
  }

  get view() {
    return this.#liveView;
  }

  get joinId() {
    return this.#id;
  }

  get csrfToken() {
    return this.#csrfToken;
  }

  get hasPageTitleChanged() {
    return this.#pageTitleChanged;
  }

  get pageTitle() {
    this.#pageTitleChanged = false;
    return this.#pageTitle ?? "";
  }

  // get sessionData() {
  //   return this.#sessionData;
  // }

  clearFlash(key: string) {
    console.log("TODO: clearFlash");
    // return this.#flash.clearFlash(this.#sessionData, key);
  }
}

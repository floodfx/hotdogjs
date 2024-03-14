import { ServerWebSocket } from "bun";
// workaround for global.BroadcastChannel type error
import { BroadcastChannel } from "node:worker_threads";
import type { Component, ComponentContext } from "../component/component";
import { Template, Tree } from "../template";
import { WsHandler } from "../ws/handler";
import { UploadConfig, UploadConfigOptions } from "../ws/handler/uploadConfig";
import { DefaultUploadEntry, UploadEntry } from "../ws/handler/uploadEntry";
import { AnyEvent, AnyPushEvent, ViewEvent, type BaseView } from "./view";

export type Event<E extends ViewEvent> = E["type"] | E;

/**
 * The context for a `View` which provides readonly properties
 * and utility functions for interacting with / updating the view from the server.
 */
export interface ViewContext<E extends ViewEvent> {
  readonly id: string;
  readonly connected: boolean;
  readonly url: URL;
  pageTitle: string;
  pushEvent(pushEvent: AnyPushEvent): void;
  pushPatch(path: string, params?: URLSearchParams, replaceHistory?: boolean): void;
  pushRedirect(path: string, params?: URLSearchParams, replaceHistory?: boolean): void;
  redirect(url: URL): void;
  dispatchEvent(event: Event<E>): void | Promise<void>;
  subscribe(event: E["type"]): void | Promise<void>;
  publish(event: Event<E>): void | Promise<void>;
  allowUpload(name: string, options?: UploadConfigOptions): void;
  cancelUpload(configName: string, ref: string): void;
  consumeUploadedEntries<T>(configName: string, fn: (path: string, entry: UploadEntry) => Promise<T>): Promise<T[]>;
  uploadedEntries(configName: string): {
    completed: UploadEntry[];
    inProgress: UploadEntry[];
  };
}

/**
 * Implementation of `ViewContext` for HTTP requests.  It is mostly full of no-ops.
 */
export class HttpViewContext<E extends ViewEvent = AnyEvent> implements ViewContext<E> {
  #id: string;
  #url: URL;
  #redirectEvent: { to: string; replace: boolean } | undefined;
  uploadConfigs: { [key: string]: UploadConfig } = {};

  constructor(id: string, url: URL) {
    this.#id = id;
    this.#url = url;
  }

  get redirectEvent(): { to: string; replace: boolean } | undefined {
    return this.#redirectEvent;
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
    this.#redirectEvent = {
      to,
      replace: replaceHistory ?? false,
    };
  }

  redirect(url: URL): void {
    this.#redirectEvent = {
      to: url.toString(),
      replace: false,
    };
  }

  subscribe(eventType: E["type"]) {
    // noop
  }

  dispatchEvent(event: E): void | Promise<void> {
    // noop
  }

  publish(event: Event<E>): void | Promise<void> {
    // noop
  }

  allowUpload(name: string, options?: UploadConfigOptions): Promise<void> {
    // add the upload config by name so lookups can be done in other `HotPage` functions
    this.uploadConfigs[name] = new UploadConfig(name, options);
    return Promise.resolve();
  }

  cancelUpload(configName: string, ref: string): Promise<void> {
    // no-op
    // istanbul ignore next
    return Promise.resolve();
  }

  consumeUploadedEntries<T>(configName: string, fn: (path: string, entry: UploadEntry) => Promise<T>): Promise<T[]> {
    // no-op
    // istanbul ignore next
    return Promise.resolve([]);
  }

  uploadedEntries(configName: string): { completed: UploadEntry[]; inProgress: UploadEntry[] } {
    // no-op
    // istanbul ignore next
    return { completed: [], inProgress: [] };
  }
}

/**
 * Implementation of `ViewContext` for WebSockets.
 */
export class WsViewContext<E extends ViewEvent = AnyEvent> implements ViewContext<E> {
  #view: BaseView<AnyEvent>;
  url: URL;
  #id: string;
  #csrfToken: string;
  #pageTitle?: string;
  #pageTitleChanged: boolean = false;
  // #flash: FlashAdaptor;
  // #sessionData: SessionData;
  pushEvents: AnyPushEvent[] = [];
  activeUploadRef: string | null = null;
  uploadConfigs: { [key: string]: UploadConfig } = {};
  parts: Tree = {};
  // the component id index
  #cidIndex = 0;
  statefulComponents: { [key: string]: Component<any, Template> } = {};

  #ws: ServerWebSocket<any>;
  #wsHandler: WsHandler<any, any>;
  #channels: Record<string, BroadcastChannel> = {};

  redirectURL?: string;

  constructor(
    id: string,
    url: URL,
    view: BaseView<AnyEvent>,
    csrfToken: string,
    ws: ServerWebSocket<any>,
    wsHandler: WsHandler<any, any>,
    // sessionData: SessionData,
    // flash: FlashAdaptor,
    onSendInfo: (event: Event<AnyEvent>) => void,
    onPushEvent: (event: AnyPushEvent) => void
  ) {
    this.url = url;
    this.#view = view;
    this.#id = id;
    this.#csrfToken = csrfToken;
    this.#ws = ws;
    this.#wsHandler = wsHandler;
    // this.#sessionData = sessionData;
    // this.#flash = flash;
  }

  allowUpload(name: string, options?: any) {
    this.uploadConfigs[name] = new UploadConfig(name, options);
  }
  cancelUpload(configName: string, ref: string) {
    const uploadConfig = this.uploadConfigs[configName];
    if (uploadConfig) {
      uploadConfig.removeEntry(ref);
    } else {
      // istanbul ignore next
      console.warn(`Upload config ${configName} not found for cancelUpload`);
    }
  }
  async consumeUploadedEntries<T>(
    configName: string,
    fn: (path: string, entry: UploadEntry) => Promise<T>
  ): Promise<T[]> {
    const uploadConfig = this.uploadConfigs[configName];
    if (uploadConfig) {
      const inProgress = uploadConfig.entries.some((entry) => !entry.done);
      if (inProgress) {
        throw new Error("Cannot consume entries while uploads are still in progress");
      }
      // noting is in progress so we can consume
      const entries = uploadConfig.consumeEntries();
      return await Promise.all(
        entries.map(async (entry) => await fn((entry as DefaultUploadEntry).getTempFile()!, entry))
      );
    }
    console.warn(`Upload config ${configName} not found for consumeUploadedEntries`);
    return [];
  }
  uploadedEntries(configName: string): { completed: UploadEntry[]; inProgress: UploadEntry[] } {
    const completed: UploadEntry[] = [];
    const inProgress: UploadEntry[] = [];
    const uploadConfig = this.uploadConfigs[configName];
    if (uploadConfig) {
      uploadConfig.entries.forEach((entry) => {
        if (entry.done) {
          completed.push(entry);
        } else {
          inProgress.push(entry);
        }
      });
    } else {
      // istanbul ignore next
      console.warn(`Upload config ${configName} not found for uploadedEntries`);
    }
    return {
      completed,
      inProgress,
    };
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
  redirect(url: URL): void {
    this.redirectURL = url.toString();
  }
  dispatchEvent(event: Event<E>) {
    if (this.connected) {
      return this.#wsHandler.handleSendInfo(event);
    }
  }
  subscribe(event: E["type"]) {
    // see publish below for publishing of messages
    if (this.connected) {
      let bc = this.#channels[event];
      if (!bc) {
        this.#channels[event] = new BroadcastChannel(event);
        bc = this.#channels[event];
      }
      bc.onmessage = (e: any) => {
        if (!e) {
          return console.error("No data in broadcast channel message for event type:", event);
        }
        this.dispatchEvent(e.data);
      };
    }
  }
  publish(event: Event<E>) {
    // convert string to event if need be
    const evt = typeof event === "string" ? { type: event } : event;
    if (this.connected) {
      let bc = this.#channels[evt.type];
      if (!bc) {
        this.#channels[evt.type] = new BroadcastChannel(evt.type);
        bc = this.#channels[evt.type];
      }
      // see subscribe above for handling of messages
      bc.postMessage(evt);
    }
  }

  component(c: Component<any, Template>): Template {
    try {
      // setup socket
      const cCtx: ComponentContext = {
        parentId: this.#id,
        connected: true,
        dispatchEvent: (event: E) => {
          this.dispatchEvent(event);
        },
        pushEvent: (pushEvent: E) => {
          this.pushEvent(pushEvent);
        },
      };

      // STATEFUL
      if (c.id) {
        const { hash, id } = c;
        const uid = `${hash}_${id}`;
        const cachedComponent = this.statefulComponents[uid];
        if (!cachedComponent) {
          // first load lifecycle
          c.cid = ++this.#cidIndex;
          this.statefulComponents[uid] = c;
          c.mount(cCtx);
        }
        c.update(cCtx);
        // return placeholder
        // @ts-ignore - force this to be a number
        return new Template([Number(c.cid)], [], true);
      }

      // warn user if `handleEvent` is implemented that it cannot be called
      if (c.handleEvent) {
        console.warn(
          `${c.constructor.name} has a handleEvent method but no "id" attribute so cannot receive events.  Set an id property if you want to handle events.`
        );
      }

      // STATELESS
      // always run full mount => update => render
      c.mount(cCtx);
      c.update(cCtx);
      return c.render();
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  get view() {
    return this.#view;
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

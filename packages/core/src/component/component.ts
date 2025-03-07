import crypto from "crypto";
import type { Template } from "../template";
import type { Event } from "../view/context";
import type { AnyEvent, AnyPushEvent, ViewEvent } from "../view/view";

/**
 * `ComponentContext` is the context that is passed to a `Component` when
 * through the lifecycle methods `mount`, `update`, and `handleEvent`.
 * It provides helper methods and properties for interacting wit the parent
 * `View`.
 */
export interface ComponentContext<E extends ViewEvent = AnyEvent> {
  /**
   * The id of the parent `View`
   */
  parentId: string;
  /**
   * Connection state of the parent `View`
   * true if connected to a websocket, false for http request
   */
  connected: boolean;
  /**
   * Send events to the parent `View`
   */
  dispatchEvent(event: Event<E>): void;
  /**
   * Send events to Hooks on the parent `View`
   */
  pushEvent(pushEvent: AnyPushEvent): void;
}

/**
 * `Component` are embedded in a parent `View` via the `component`. The
 * `Component` lifecycle is managed by the parent `View`.
 *
 * `Component`s can be stateless or stateful. We determine if a `Component` is stateful
 * if the `id` attribute is not undefined.  If the `id` attribute is undefined, then the
 * `Component` is stateless.  Stateful `Components` can handle events from the parent `View`
 * and maintain state across renders.  Stateless `Components` cannot handle events and are
 * effectively "re-renderable" across renders.
 *
 * Stateless components' lifecycle
 * consists of running `mount`, then `update`, then `render` in that order every time
 * they are rendered.  The `preload` method is called once for all stateless components.
 *
 * Stateful components' lifecycle consists of running `preload` `mount`, `update`, and `render`
 * on the first time a `Component` is loaded followed by `update`, and `render` on
 * subsequent renders.  Stateful components can also handle events from the parent `View`
 * and when an event is handled, the `update` and `render` methods are called.
 */
export interface Component<E extends ViewEvent, RenderResult> {
  /**
   * The id of the `Component`.  If the `id` is undefined, then the `Component` is stateless.
   */
  id?: string | number;
  /**
   * the cid of the `Component` used for rendering and handling events.
   * The cid is automatically set by the parent `View` and changing it will
   * result in undefined behavior.
   */
  cid?: number;

  readonly hash: string;

  /**
   * Mounts the `Component`'s stateful context.  This is called only once
   * for stateful `Component` and every render for a stateless `Component`.
   * This is called prior to `update` and `render`.
   *
   */
  mount: (ctx: ComponentContext<E>) => void;

  /**
   * Allows the `Component` to update its state.  This is called
   * prior to `render` for both stateful and stateless `Component`s.  This is a
   * good place to add additional business logic to the `Component` if you
   * need to change the context (e.g. derive data from or transform).
   *
   * @param ctx a `ComponentContext` with the context for this `Component`
   */
  update: (ctx: ComponentContext<E>) => void;

  /**
   * Optional method that handles events from the `Component` initiated by the end-user. Only
   * called for "stateful" `Component`s (i.e. `Component`s with an "id" in their context).
   * In other words, only components with an `id` attribute in their "LiveContext" can handleEvents.
   */
  handleEvent?: (ctx: ComponentContext<E>, event: E) => void;

  /**
   * Shuts down the `Component` and cleans up any resources.  This is called when the parent `View`
   * is shutting down.
   */
  shutdown: () => void;

  /**
   *  Renders the `Component` into a `Template` for rendering by the parent `View`.
   */
  render(): RenderResult;
}

abstract class DefaultComponent<E extends ViewEvent, T> implements Component<E, T> {
  id?: string | number;
  cid?: number;

  mount(ctx: ComponentContext<E>): void {
    // no op
  }
  update(ctx: ComponentContext<E>): void {
    // no op
  }

  shutdown(): void {
    // no op
  }

  #hash?: string;
  get hash(): string {
    if (!this.#hash) {
      this.#hash = hashComponent(this);
    }
    return this.#hash;
  }

  abstract render(): T;
}

/**
 * `BaseComponent` is a base class for creating `Component`s.  It provides
 * a default implementation for the `preload`, `mount`, `update`, and `handleEvent`
 * and requires an implementation of the `render` method.
 */
export abstract class BaseComponent<E extends ViewEvent = AnyEvent> extends DefaultComponent<E, Template> {}

/**
 * `BaseJSXComponent` is a base class for creating `Component`s that render JSX.  It is highly
 * experimental and probably should not be used yet.
 */
// export abstract class BaseJSXComponent<E extends ViewEvent = AnyEvent> extends DefaultComponent<E, ReactNode> {}

/**
 * Calculates the "hash" (opaque string) of a Component.  Used by the framework
 * internally to create a unique id for Components for sorting into preload
 * component groups.
 */
function hashComponent(c: Component<any, any>): string {
  const code =
    (c.constructor?.toString() ?? "") +
    (c.mount?.toString() ?? "") +
    (c.update?.toString() ?? "") +
    (c.render?.toString() ?? "") +
    (c.handleEvent?.toString() ?? "");
  if (code.length === 0) {
    throw new Error("Cannot hash an empty Component:" + JSON.stringify(c));
  }
  return crypto.createHash("sha1").update(code).digest("hex");
}

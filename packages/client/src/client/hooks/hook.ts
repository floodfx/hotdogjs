import { LiveSocket } from "phoenix_live_view";

// better than @types/phoenix_live_view/hooks.d.ts
// TODO update types in DefinitelyTyped
//https://github.com/DefinitelyTyped/DefinitelyTyped/blob/0f3e3a0e1f0ffc33250f9ce9526533e60678bd3d/types/phoenix_live_view/hooks.d.ts

export type OnReply = (reply: any, ref: number) => any;
export type CallbackRef = (customEvent: any, bypass: boolean) => string;

/**
 * ViewHookInstance defines the instance properties and methods that are available to ViewHooks at runtime
 */
interface ViewHookInstance {
  /**
   * Reference to the bound DOM node that the hook is attached to
   */
  el: HTMLElement;

  /**
   * Reference to the underlying LiveSocket instance
   */
  liveSocket: LiveSocket;

  /**
   * Pushes an event from the client to the Hotdogjs server
   * @param event - The name of the event to push
   * @param payload - The payload to send with the event
   * @param callback - Optional callback that receives the reply from the server
   */
  pushEvent: (event: string, payload: any, callback?: OnReply) => void;

  /**
   * Pushes targeted events from the client to `View` and `Component` instances.
   * Sends the event to the `Component` or `View` where the selectorOrTarget is defined.
   * @param selectorOrTarget - Query selector string or DOM element to target
   * @param event - The name of the event to push
   * @param payload - The payload to send with the event
   * @param callback - Optional callback that receives the reply from the server
   */
  pushEventTo: (selectorOrTarget: string | HTMLElement, event: string, payload: any, callback?: OnReply) => void;

  /**
   * Handles events pushed from the server `ViewContext.pushEvent` call
   * @param event - The name of the event to handle
   * @param callback - Callback function that receives the event payload
   */
  handleEvent: (event: string, callback: (payload: any) => void) => CallbackRef;

  /**
   * Removes handler for an event
   * @param ref - The reference to the event handler to remove
   */
  removeHandleEvent: (ref: CallbackRef) => void;

  /**
   * Injects a list of file-like objects into an uploader
   * @param name - The name of the uploader defined by `ViewContext.allowUpload`
   * @param files - files to upload
   */
  upload: (name: string, files: any) => void;

  /**
   * Injects files into an uploader targeting a specific `View` or `Component`
   * @param selectorOrTarget - Query selector string or DOM element to target
   * @param name - The name of the uploader defined by `ViewContext.allowUpload`
   * @param files - files to upload
   */
  uploadTo: (selectorOrTarget: any, name: string, files: any) => void;
}

/**
 * ViewHook interface for client-side JavaScript interop with Hotdogjs.
 * Hooks allow custom client-side behavior when an element is added, updated, or removed by the server.
 * Note: A unique DOM ID must always be set on the element that uses the hook.
 */
export type ViewHook = {
  /**
   * Called when the element has been added to the DOM and its server `View` has finished mounting
   */
  mounted?(): void;

  /**
   * Called when the element is about to be updated in the DOM.
   * Note: Any call here must be synchronous as the operation cannot be deferred or cancelled.
   */
  beforeUpdate?(): void;

  /**
   * Called when the element has been updated in the DOM by the server
   */
  updated?(): void;

  /**
   * Called when the element has been removed from the page,
   * either by a parent update, or by the parent being removed entirely
   */
  destroyed?(): void;

  /**
   * Called when the element's parent LiveView has disconnected from the server
   */
  disconnected?(): void;

  /**
   * Called when the element's parent LiveView has reconnected to the server
   */
  reconnected?(): void;
} & ThisType<ViewHookInstance>;

import { WsViewContext, type ComponentContext } from "index";
import { Template, Tree } from "template";
import { Phx } from "../protocol/phx";
import { DefaultUploadEntry } from "./uploadEntry";

type EventUpload = {
  path: string; // config path
  last_modified: number; // ts of last modified
  ref: string; // order of upload
  name: string; // original filename
  type: string; // mime type
  size: number; // bytes
};

interface EventUploads {
  uploads?: {
    [key: string]: EventUpload[];
  };
}

//{type: "click", event: "down", value: {value: ""}}
type ClickPayload = Phx.EventPayload<"click", { value: string }>;
// lv:clear-flash is a special click event with hardcoded "event" value
// internal message called to clear flash messages from the session
// e.g. {"type":"click","event":"lv:clear-flash","value":{"key":"info"}}
type LVClearFlashPayload = Phx.EventPayload<"click", { key: string }, "lv:clear-flash">;

//{"type":"form","event":"update","value":"seats=3&_target=seats","uploads":{}}
type FormPayload = Phx.EventPayload<"form", string> & EventUploads;

// See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
// for all the string values for the key that kicked off the event
// {type: "keyup", event: "key_update", value: {key: "ArrowUp"}}
// {type: "keyup", event: "key_update", value: {key: "ArrowUp", value: ""}}
// {type: "keyup", event: "key_update", value: {key: "ArrowUp", value: "foo"}}
// NOTE: these payloads are the same for phx-window-key* events and phx-key* events
type KeyUpPayload = Phx.EventPayload<"keyup", { key: string; value?: string }>;
type KeyDownPayload = Phx.EventPayload<"keydown", { key: string; value?: string }>;

// Focus and Blur events
// {type: "focus", event: "focus", value: {value: ""}}
// {type: "blur", event: "blur", value: {value: ""}}
type FocusPayload = Phx.EventPayload<"focus", { value: string }>;
type BlurPayload = Phx.EventPayload<"blur", { value: string }>;

// Hook event
// initiated by calling this.pushEvent("edit"...) in client javascript
// {type: "hook", event: "edit", value: {id: "abc"}}
type HookPayload = Phx.EventPayload<"hook", Record<string, string>>;

export async function handleEvent(ctx: WsViewContext, payload: Phx.EventPayload): Promise<Template | Tree> {
  try {
    const { type, event, cid } = payload;

    let value: { [key: string]: unknown } | string | number = {};
    switch (type) {
      case "click":
      case "keyup":
      case "keydown":
      case "blur":
      case "focus":
      case "hook":
        value = payload.value;
        break;
      case "form":
        // parse payload into form data
        const pl = payload as FormPayload;
        value = Object.fromEntries(new URLSearchParams(pl.value));
        // if _csrf_token is set, ensure it is the same as session csrf token
        if (value.hasOwnProperty("_csrf_token")) {
          if (value._csrf_token !== ctx.csrfToken) {
            throw new Error("Mismatched CSRF token");
          }
        } else {
          console.warn(
            `Warning: form event data missing _csrf_token value. \nConsider passing it in via a hidden input named "_csrf_token".  \nYou can get the value from the Meta object passed the render method. \n`
          );
        }

        // parse uploads into uploadConfig for given name
        if (pl.uploads) {
          const { uploads } = pl;
          // get _target from form data
          const target = value["_target"] as string;
          if (target && ctx.uploadConfigs.hasOwnProperty(target)) {
            const config = ctx.uploadConfigs[target];
            // check config ref matches uploads key
            if (uploads.hasOwnProperty(config.ref)) {
              const entries = uploads[config.ref].map((upload) => {
                return new DefaultUploadEntry(upload, config);
              });
              config.setEntries(entries);
            }
          }
        }
        break;
      default:
        throw new Error(`Unknown event type: ${type}`);
    }

    // for "lv:clear-flash" events we don't need to call handleEvent
    if (event === "lv:clear-flash") {
      const clearFlashPayload = payload as LVClearFlashPayload;
      const key = clearFlashPayload.value.key;
      ctx.clearFlash(key);
      // render the live view with the cleared flash
      return await ctx.view.render({ csrfToken: ctx.csrfToken, uploads: ctx.uploadConfigs });
    }

    // if value is a string or number, wrap it in an object
    if (typeof value === "string" || typeof value === "number") {
      value = { value };
    }

    // if no cid then target is the View
    if (!cid) {
      // target is the View
      await ctx.view.handleEvent(ctx, { type: event, ...value });
      return await ctx.view.render({ csrfToken: ctx.csrfToken, uploads: ctx.uploadConfigs });
    }

    // if cid, then target is a Component
    // find component by cid and call handleEvent
    const component = ctx.view.__components.find((c) => c.cid === cid);

    // check invarants
    if (!component) {
      throw new Error(`Could not find component for cid:${cid}`);
    }
    if (!component.id) {
      throw new Error(
        `Component "${component.constructor.name}", has no id and therefore is not stateful and cannot handle events`
      );
    }
    if (!component.handleEvent) {
      throw new Error(
        `Component "${component.constructor.name}", with id:${component.id} has not implemented handleEvent() method`
      );
    }

    // ok, this is a stateful component with an id and handleEvent method
    const cCtx: ComponentContext = {
      parentId: ctx.id,
      connected: true,
      dispatchEvent: (event: any) => {
        ctx.dispatchEvent(event);
      },
      pushEvent: (pushEvent: any) => {
        ctx.pushEvent(pushEvent);
      },
    };

    // handleEvent, update, and re-render
    component.handleEvent(cCtx, { type: event, ...value });
    component.update(cCtx);
    const newView = component.render();
    // update the component in the view
    return {
      c: {
        [`${cid}`]: newView.toTree(true),
      },
    };
  } catch (e) {
    console.error("Error handling event", e);
    throw e;
  }
}

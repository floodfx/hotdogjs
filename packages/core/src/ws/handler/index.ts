import { FileSystemRouter, ServerWebSocket } from "bun";
import type { Component } from "src/component/component";
import { Template, Tree, safe } from "../../template";
import { deepDiff } from "../../template/diff";
import { WsViewContext, type Event } from "../../view/context";
import type { AnyEvent, AnyPushEvent, BaseView, MountEvent, RenderMeta } from "../../view/view";
import { PhxJoinPayload } from "../protocol/payloads";
import { Phx } from "../protocol/phx";
import { PhxReply } from "../protocol/reply";
import { handleEvent } from "./event";
import { onAllowUpload, onProgressUpload, onUploadBinary } from "./upload";

type WsHandlerOptions = {
  wrapperTemplateFn?: (tmpl: Template) => Template;
  onError?: (err: any) => void;
  debug?: (msg: string) => void;
};

/**
 * WsHandler contains the connection to the websocket and is responsible for
 * managing the lifecycle of the View and any Components that are
 * part of the View.
 */
export class WsHandler<T> {
  #ws: ServerWebSocket<T>;
  #wrapperTemplateFn?: (tmpl: Template) => Template;
  #onError?: (err: any) => void;
  #debug?: (msg: string) => void;
  #router: FileSystemRouter;
  #csrfToken: string;
  #ctx?: WsViewContext;
  #activeMsg: boolean = false;
  #msgQueue: Phx.Msg<unknown>[] = [];
  #subscriptionIds: { [key: string]: string } = {};
  #lastHB?: number;
  #hbInterval?: ReturnType<typeof setInterval>;
  // #components;

  constructor(ws: ServerWebSocket<T>, router: FileSystemRouter, csrfToken: string, options?: WsHandlerOptions) {
    this.#ws = ws;
    this.#router = router;
    this.#csrfToken = csrfToken;
    this.#wrapperTemplateFn = options?.wrapperTemplateFn;
    this.#onError = options?.onError;
    this.#debug = options?.debug;
  }

  async handleMsgString(msg: string) {
    await this.handleMsg(Phx.parse(msg));
  }

  async handleMsgData(msg: Buffer) {
    await this.handleMsg(Phx.parseBinary(msg));
  }

  /**
   * handleMsg is the main entry point for handling messages from both the websocket
   * and internal messages from the View. It is responsible for routing messages
   * based on the message event and topic. It also handles queuing messages if a message
   * is already being processed since we want to ensure that messages are processed in order.
   * @param msg a Phx.Msg to be routed
   */
  private async handleMsg(msg: Phx.Msg<unknown>): Promise<void> {
    this.maybeDebug(JSON.stringify(msg));
    try {
      // attempt to prevent race conditions by queuing messages
      // if we are already processing a message
      if (this.#activeMsg) {
        this.#msgQueue.push(msg);
        return;
      }
      this.#activeMsg = true;

      // we route based on the event and topic
      const event = msg[Phx.MsgIdx.event];
      const topic = msg[Phx.MsgIdx.topic];
      switch (event) {
        case "phx_join":
          // phx_join event used for both View joins and LiveUpload joins
          // check prefix of topic to determine if View (lv:*) or LiveUpload (lvu:*)
          if (topic.startsWith("lv:")) {
            const payload = msg[Phx.MsgIdx.payload] as unknown as PhxJoinPayload;

            // figure out if we are using url or redirect for join URL
            const { url: urlString, redirect: redirectString } = payload;
            if (urlString === undefined && redirectString === undefined) {
              throw new Error("Join message must have either a url or redirect property");
            }

            // checked one of these was defined in MessageRouter
            const url = new URL((urlString || redirectString)!);

            // route to the View based on the URL
            const matchResult = this.#router.match(url.toString());
            if (!matchResult) {
              throw Error(`no View found for ${url}`);
            }
            const { default: View } = await import(matchResult.filePath);
            const view = new View() as BaseView<AnyEvent>;

            // extract params, session and socket from payload
            const { params: payloadParams, session: payloadSession, static: payloadStatic } = payload;

            // if session csrfToken does not match payload csrfToken, reject join
            if (this.#csrfToken !== payloadParams._csrf_token) {
              console.error("Rejecting join due to mismatched csrfTokens", this.#csrfToken, payloadParams._csrf_token);
              return;
            }

            // success! now let's initialize the ViewContext which stores
            // the state and connection of the View
            this.#ctx = new WsViewContext(
              topic,
              url,
              view,
              payloadParams._csrf_token,
              this.#ws,
              this,
              this.handleSendInfo.bind(this),
              this.handlePushEvent.bind(this)
            );

            // run initial lifecycle steps for the View: mount => handleParams => render
            const mountParams: MountEvent = {
              type: "mount",
              ...payloadParams,
              params: matchResult.params,
              query: matchResult.query,
            };

            await view.mount(this.#ctx!, mountParams);
            await view.handleParams(this.#ctx!, url);
            const tmpl = await view.render(this.meta());

            // convert the view into a parts tree
            const parts = await this.templateParts(tmpl);

            // send the response and cleanup
            this.send(PhxReply.renderedReply(msg, parts));
            // start heartbeat interval
            this.#lastHB = Date.now();
            this.#hbInterval = setInterval(() => {
              // shutdown if we haven't received a heartbeat in 60 seconds
              if (this.#lastHB && Date.now() - this.#lastHB > 60_000) {
                this.#hbInterval && clearInterval(this.#hbInterval);
                this.close();
              }
            }, 30_000);
          } else if (topic.startsWith("lvu:")) {
            const payload = msg[Phx.MsgIdx.payload] as Phx.JoinUploadPayload;
            // perhaps we should check this token matches entries send in the "allow_upload" event?
            const { token } = payload;
            // send ACK
            // TODO? send more than ack? what?
            this.send(PhxReply.renderedReply(msg, {}));
          } else {
            // istanbul ignore next
            throw new Error(`Unknown phx_join prefix: ${topic}`);
          }
          break;
        case "event":
          try {
            const payload = msg[Phx.MsgIdx.payload] as Phx.EventPayload;
            let diff = await handleEvent(this.#ctx!, payload);

            // check redirect
            if (this.#ctx!.redirectURL) {
              this.redirect(msg, this.#ctx!.redirectURL);
              return;
            }

            if (diff instanceof Template) {
              diff = await this.viewToDiff(diff);
            }
            this.send(PhxReply.diffReply(msg, diff));
          } catch (e) {
            console.error("error handling event", e);
          }
          break;
        case "info":
          try {
            const payload = msg[Phx.MsgIdx.payload] as AnyEvent;
            // lifecycle handleInfo => render
            await this.#ctx!.view.handleEvent(this.#ctx!, payload);
            const view = await this.#ctx!.view.render(this.meta());
            const diff = await this.viewToDiff(view);
            this.send(PhxReply.diff(null, this.#ctx!.joinId, diff));
          } catch (e) {
            /* istanbul ignore next */
            console.error(`Error sending internal info`, e);
          }
          break;
        case "live_redirect":
          const payload = msg[Phx.MsgIdx.payload] as Phx.LiveNavPushPayload;
          const { to } = payload;
          // to is relative so need to provide the urlBase determined on initial join
          this.#ctx!.url = new URL(to, this.#ctx!.url);
          // let the `View` udpate its context based on the new url
          await this.#ctx!.view.handleParams(this.#ctx!, this.#ctx!.url);
          // send the message on to the client
          this.send(msg as PhxReply.Reply);
          break;
        case "live_patch":
          // two cases of live_patch: server-side (pushPatch) or client-side (click on link)
          try {
            const payload = msg[Phx.MsgIdx.payload] as Phx.LivePatchPayload | Phx.LiveNavPushPayload;
            if (payload.hasOwnProperty("url")) {
              // case 1: client-side live_patch
              const url = new URL((payload as Phx.LivePatchPayload).url);
              this.#ctx!.url = url;
              await this.#ctx!.view.handleParams(this.#ctx!, this.#ctx!.url);
              const view = await this.#ctx!.view.render(this.meta());
              const diff = await this.viewToDiff(view);
              this.send(PhxReply.diffReply(msg, diff));
            } else {
              // case 2: server-side live_patch
              const { to } = payload as Phx.LiveNavPushPayload;
              // to is relative so need to provide the urlBase determined on initial join
              this.#ctx!.url = new URL(to, this.#ctx!.url);
              // let the `View` udpate its context based on the new url
              await this.#ctx!.view.handleParams(this.#ctx!, this.#ctx!.url);
              // send the message on to the client
              this.send(msg as PhxReply.Reply);
            }
          } catch (e) {
            /* istanbul ignore next */
            console.error("Error handling live_patch", e);
          }
          break;
        // Start File Upload Events
        case "allow_upload":
          try {
            const payload = msg[Phx.MsgIdx.payload] as Phx.AllowUploadPayload;
            const { view, config, entries } = await onAllowUpload(this.#ctx!, payload);
            const diff = await this.viewToDiff(view);
            this.send(PhxReply.allowUploadReply(msg, diff, config, entries));
          } catch (e) {
            console.error("error handling allow_upload", e);
          }
          break;
        case "progress":
          try {
            const payload = msg[Phx.MsgIdx.payload] as Phx.ProgressUploadPayload;
            const view = await onProgressUpload(this.#ctx!, payload);
            const diff = await this.viewToDiff(view);
            this.send(PhxReply.diffReply(msg, diff));
          } catch (e) {
            console.error("error handling progress", e);
          }
          break;
        case "chunk":
          try {
            const replies = await onUploadBinary(this.#ctx!, msg as Phx.Msg<Buffer>);
            for (const reply of replies) {
              this.send(reply);
            }
          } catch (e) {
            console.error("error handling chunk", e);
          }
          break;
        // End File Upload Events
        case "heartbeat":
          this.#lastHB = Date.now();
          this.send(PhxReply.heartbeat(msg));
          break;
        case "phx_leave":
          try {
            // stop the heartbeat
            if (this.#hbInterval) {
              clearInterval(this.#hbInterval);
            }
          } catch (e) {
            console.error("error stopping heartbeat", e);
          }
          try {
            // shutdown the View
            if (this.#ctx) {
              // shutdown the view components
              Object.values(this.#ctx.statefulComponents).forEach((c: Component<AnyEvent, Template>) => {
                c.shutdown();
              });
              await this.#ctx.view.shutdown();
              // clear out the context
              this.#ctx = undefined;
            }
          } catch (e) {
            console.error("error shutting down View:" + this.#ctx?.joinId, e);
          }

          try {
            // unsubscribe from PubSubs
            Object.entries(this.#subscriptionIds).forEach(async ([topic, subId]) => {
              await this.#ws.unsubscribe(topic);
            });
          } catch (e) {
            console.error("error unsubscribing from pubsub", e);
          }
          break;
        default:
          throw new Error(`unexpected phx protocol event ${event}`);
      }

      // we're done with this message, so we can process the next one if there is one
      this.#activeMsg = false;
      const nextMsg = this.#msgQueue.pop();
      if (nextMsg) {
        this.handleMsg(nextMsg);
      }
    } catch (e) {
      this.maybeHandleError(e);
    }
  }

  send(reply: PhxReply.Reply) {
    try {
      const shutdown = this.maybeShutdown();
      if (!shutdown) {
        const status = this.#ws.send(PhxReply.serialize(reply));
        if (status > 0) {
          // successfully sent message
          return;
        }
        // otherwise something went wrong
        if (status === 0) {
          // dropped message
          this.maybeHandleError(new Error("send error"));
          this.maybeShutdown();
        } else {
          // handle backpressure?
        }
      }
    } catch (e) {
      this.maybeHandleError(e);
    }
  }

  async close() {
    // redirect this through handleMsg after adding the joinId
    const joinId = this.#ctx?.joinId ?? "unknown";
    this.handleMsg([null, null, joinId, "phx_leave", null]);
  }

  /**
   * Check if the websocket is closed and if so, shutdown the View
   */
  private maybeShutdown() {
    // closing = 2, closed = 3
    if (this.#ws.readyState > 1) {
      this.maybeDebug(`ws closed, shutting down View: ${this.#ctx?.joinId}`);
      this.close();
      return true;
    }
    return false;
  }

  /**
   * Call the config.onError callback on send errors and if the
   * websocket is closed, shutdown the View
   */
  private maybeHandleError(err: any) {
    this.maybeShutdown();
    if (err) {
      try {
        this.#onError?.(err);
      } catch (e) {
        console.error(`error calling onError with err:${err}.`, e);
      }
    }
  }

  private maybeDebug(msg: string) {
    try {
      this.#debug?.(msg);
    } catch (e) {
      console.error(`error debugging message: ${msg}`, e);
    }
  }

  private async viewToDiff(tmpl: Template): Promise<Tree> {
    // wrap in root template if there is one
    tmpl = await this.maybeWrapView(tmpl);

    // diff the new view with the old view
    const newParts = tmpl.toTree(true);
    let diff = deepDiff(this.#ctx!.parts, newParts);
    // store newParts for future diffs
    this.#ctx!.parts = newParts;

    // now add the components, events, and title parts
    diff = this.maybeAddLiveComponentsToParts(diff);
    diff = this.maybeAddEventsToParts(diff);
    return this.maybeAddTitleToView(diff);
  }

  private async templateParts(tmpl: Template): Promise<Tree> {
    // step 1: if provided, wrap the rendered `View` inside the root template
    tmpl = await this.maybeWrapView(tmpl);

    // step 2: store parts for later diffing after rootTemplate is applied
    let parts = tmpl.toTree(true);

    // step 3: add any `LiveComponent` renderings to the parts tree
    parts = this.maybeAddLiveComponentsToParts(parts);

    // step 4: add any push events to the parts tree
    parts = this.maybeAddEventsToParts(parts);

    // step 5: if set, add the page title to the parts tree
    parts = this.maybeAddTitleToView(parts);

    // set the parts tree on the context
    this.#ctx!.parts = parts;

    return parts;
  }

  private maybeAddEventsToParts(parts: Tree) {
    if (this.#ctx!.pushEvents.length > 0) {
      const events = structuredClone(this.#ctx!.pushEvents);
      this.#ctx!.pushEvents = []; // reset
      // map events to tuples of [type, values]
      const e = events.map((event) => {
        const { type, ...values } = event;
        return [type, values];
      });
      return {
        ...parts,
        e,
      };
    }
    return parts;
  }

  private maybeAddTitleToView(parts: Tree) {
    if (this.#ctx!.hasPageTitleChanged) {
      const t = this.#ctx!.pageTitle; // resets changed flag
      parts = {
        ...parts,
        t,
      };
    }
    return parts;
  }

  private async maybeWrapView(tmpl: Template) {
    if (this.#wrapperTemplateFn) {
      tmpl = await this.#wrapperTemplateFn(safe(tmpl));
    }
    return tmpl;
  }

  private maybeAddLiveComponentsToParts(tree: Tree) {
    const changedParts: Tree = {};
    // iterate over stateful components to find changed
    Object.values(this.#ctx!.statefulComponents).forEach((c) => {
      const newTree = c.render().toTree(true);
      changedParts[`${c.cid}`] = newTree;
    });
    // if any stateful component changed
    if (Object.keys(changedParts).length > 0) {
      // return parts with changed LiveComponents
      return {
        ...tree,
        c: changedParts,
      };
    }
    return tree;
  }

  async redirect(msg: Phx.Msg<unknown>, to: string) {
    this.send(PhxReply.redirect(msg, to));
  }

  async pushNav(
    navEvent: "live_redirect" | "live_patch",
    path: string,
    params?: URLSearchParams,
    replaceHistory: boolean = false
  ) {
    try {
      // construct the outgoing message
      const to = params ? `${path}?${params}` : path;
      const kind = replaceHistory ? "replace" : "push";
      const msg: Phx.Msg<Phx.LiveNavPushPayload> = [
        null, // no join reference
        null, // no message reference
        this.#ctx!.joinId,
        navEvent,
        { kind, to },
      ];
      // send this back through handleMsg
      this.handleMsg(msg);
    } catch (e) {
      /* istanbul ignore next */
      console.error(`Error handling ${navEvent}`, e);
    }
  }

  handlePushEvent(event: AnyPushEvent) {
    this.#ctx!.pushEvents.push(event);
  }

  handleSendInfo(info: Event<AnyEvent>) {
    // info can be a string or an object so check it
    // if it's a string, we need to convert it to a LiveInfo object
    if (typeof info === "string") {
      info = { type: info };
    }
    this.handleMsg([null, null, this.#ctx!.joinId, "info", info] as Phx.Msg);
  }

  meta<E extends AnyEvent>(): RenderMeta<E> {
    return {
      csrfToken: this.#csrfToken,
      uploads: this.#ctx!.uploadConfigs,
      component: (c) => {
        return this.#ctx!.component(c);
      },
    };
  }
}

import { FileSystemRouter, MatchedRoute, type BuildOutput, type BunFile, type WebSocketHandler } from "bun";
import { randomUUID } from "crypto";
import type { Component, ComponentContext } from "../component/component";
import { html, safe, templateFromString, type Template } from "../template";
import { HttpViewContext } from "../view/context";
import type { AnyEvent, BaseView, MountEvent } from "../view/view";
import { WsHandler, type WsHandlerOptions } from "../ws/handler";
import type { Conf } from "./conf";

export type ServerInfo = {
  csrfToken: string;
  wsHandler: WsHandler<any, any>;
};


export class Server {
  #conf: Conf;
  #router?: FileSystemRouter;

  constructor(conf: Conf) {
    this.#conf = conf;
  }

  get router() {
    if (!this.#router) {
      this.#router = new FileSystemRouter({
        style: "nextjs",
        dir: this.#conf.viewsDir,
      });
    }
    return this.#router;
  }

  async viewRouter<R extends object>(
    req: Request,
    requestDataExtractor: (r: Request) => Promise<R> = async () => ({} as R),
  ): Promise<Response | null> {
    const matchedRoute = this.router.match(req);
    if (matchedRoute) {
      const resolver = this.#conf.viewTemplateResolver ?? this.loadPublicIndexTemplate;
      const url = new URL(req.url);
      const requestData = await requestDataExtractor(req);
      return renderHttpView(url, matchedRoute, requestData, await resolver(matchedRoute, this.#conf), this.#conf);
    }
    return null;
  }

  async wsRouter<R extends object>(req: Request, requestDataExtractor: (r: Request) => Promise<R> = async () => ({} as R),): Promise<[boolean, R & { csrfToken: string } | undefined]> {
    const url = new URL(req.url);
    if (url.pathname === "/live/websocket") {
      // _csrf_token is required for websocket connections
      // and automatically added to the query params by the client javascript
      const csrfToken = url.searchParams.get("_csrf_token") ?? "";
      if (csrfToken) {
        const requestData = await requestDataExtractor(req);
        return [true, { csrfToken, ...(requestData as R)}];
      } else {
        console.warn(`No "_csrf_token" found in query params`);
      }
    }
    return [false, undefined];
  }

  websocket(options?: WsHandlerOptions): WebSocketHandler<ServerInfo> {
    const router = this.router;
    return {
      open(ws) {
        const csrfToken = ws.data.csrfToken;
        // remove csrfToken from ws.data
        const reqData = {
          ...ws.data,
        };
        // @ts-ignore - we want to remove csrfToken from reqData
        delete reqData.csrfToken;
        ws.data.wsHandler = new WsHandler(ws, router, csrfToken, reqData, options);
      },
      async message(ws, message) {
        if (message instanceof Buffer) {
          await ws.data.wsHandler.handleMsgData(message);
          return;
        }
        await ws.data.wsHandler.handleMsgString(message);
      },
      close(ws) {
        ws.data.wsHandler?.close();
      },
    };
  }

  // TODO - this is pretty hacky but gets the job done for now
  staticRouter(req: Request): BunFile | null {
    const url = new URL(req.url);
    const publicDir = this.#conf.publicDir;
    if (!url.pathname.startsWith(this.#conf.staticPrefix)) {
      return null;
    }
    if (this.#conf.staticExcludes.includes(url.pathname)) {
      return null;
    }
    let name = url.pathname.split("/").slice(2).join("/");
    name = name.replace(/\.\./g, ""); // remove any directory traversal
    // check file exists
    const file = Bun.file(publicDir + "/" + name);
    if (!file.exists()) {
      return null;
    }
    return file;
  }

  async maybeBuildClientJavascript(): Promise<BuildOutput> {
    if (!this.#conf.buildClientJS) {
      return { success: true, logs: [], outputs: [] };
    }
    const file = Bun.file(this.#conf.clientJSSourceFile);
    if (!file.exists()) {
      throw new Error(`Cannot compile client file. "${this.#conf.clientJSSourceFile}" does not exist`);
    }
    return await Bun.build({
      entrypoints: [this.#conf.clientJSSourceFile],
      outdir: this.#conf.clientJSDestDir,
      define: {
        // define replacement for placeholder in client js with the websocket url
        // replace with environment variable if set, otherwise default to /live
        "window.HOTDOG_WS_URL": process.env.HOTDOG_WS_URL ?? "/live",
      },
    });
  }

  private async loadPublicIndexTemplate(matchedRoute: MatchedRoute, conf: Conf): Promise<string> {
    return await Bun.file(conf.publicDir + "/index.html").text();
  }
}

/**
 * renderHttpView is a helper function to render a View page server.
 * @param url the URL of the request
 * @param matchedRoute the MatchedRoute from the FileSystemRouter
 * @param requestData the request data to pass to the View
 * @param pageTemplate the html template for the page
 * @param config the server configuration
 * @param templateData the data to pass to the page template (default is empty object)
 * @param htmlTag optional tag to wrap the View content in, defaults to "div"
 * @returns
 */
async function renderHttpView<R extends object, T extends object>(
  url: URL,
  matchedRoute: MatchedRoute,
  requestData: R,
  pageTemplate: string,
  config: Conf,
  templateData: T = {} as T,
  htmlTag: string = "div"
): Promise<Response> {
  const { default: View } = await import(matchedRoute.filePath);
  const websocketBaseUrl = config.wsBaseUrl;
  const csrfToken = randomUUID();
  const viewId = randomUUID();
  const view = new View() as BaseView<AnyEvent>;
  const ctx = new HttpViewContext(viewId, url);
  const mountParams: MountEvent & R = {
    type: "mount",
    _csrf_token: csrfToken,
    _mounts: -1,
    query: matchedRoute.query,
    params: matchedRoute.params,
    ...requestData,
  };
  // HTTP Lifecycle is: mount => handleParams => render
  await view.mount(ctx, mountParams);
  // check for redirects from mount
  if (ctx.redirectEvent) {
    return Response.redirect(ctx.redirectEvent.to, 302);
  }
  await view.handleParams(ctx, url);
  // check for redirects from handleParams
  if (ctx.redirectEvent) {
    // @ts-ignore - ts wrongly thinks redirect is undefined
    return Response.redirect(ctx.redirectEvent.to, 302);
  }

  const cCtx: ComponentContext<AnyEvent> = {
    parentId: viewId,
    connected: false,
    dispatchEvent: (event: AnyEvent) => {
      ctx.dispatchEvent(event);
    },
    pushEvent: (pushEvent: AnyEvent) => {
      ctx.pushEvent(pushEvent);
    },
  };

  // replace `component` method with one that just renders all the components
  const component = (c: Component<AnyEvent, Template>) => {
    c.mount(cCtx);
    c.update(cCtx);
    return c.render();
  };

  // render to get the components into preloaded state
  const tmpl = await view.render({ csrfToken: csrfToken, uploads: ctx.uploadConfigs, component });
  const content = html`<${htmlTag} data-phx-main="true" data-phx-session="" data-phx-static="" id="phx-${viewId}">
    ${safe(tmpl)}
  </${htmlTag}>`;
  const template = templateFromString(pageTemplate, { content, ...templateData, csrfToken, websocketBaseUrl});
  return new Response(template.toString(), {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

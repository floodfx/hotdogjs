import { FileSystemRouter, MatchedRoute, type BunFile, type WebSocketHandler } from "bun";
import { randomUUID } from "crypto";
import { URL } from "node:url";
import type { Component, ComponentContext } from "../component/component";
import { html, safe, templateFromString, type Template } from "../template";
import { HttpViewContext } from "../view/context";
import type { AnyEvent, BaseView, MountEvent } from "../view/view";
import { WsHandler } from "../ws/handler";
import type { Conf } from "./conf";

export type ServerInfo = {
  csrfToken: string;
  wsHandler: WsHandler<any>;
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
        dir: this.#conf.pagesDir,
      });
    }
    return this.#router;
  }

  async viewRouter(
    req: Request,
    middleware: (req: Request) => Promise<Response | null> = async () => null
  ): Promise<Response | null> {
    const matchedRoute = this.router.match(req);
    if (matchedRoute) {
      const middlewareResp = await middleware(req);
      if (middlewareResp) {
        return middlewareResp;
      }
      const resolver = this.#conf.pageTemplate ?? this.loadPublicIndexTemplate;
      return renderHttpView(matchedRoute, req, await resolver(matchedRoute, this.#conf), {});
    }
    return null;
  }

  wsRouter(req: Request): [boolean, { csrfToken: string } | undefined] {
    const url = new URL(req.url);
    if (url.pathname === "/live/websocket") {
      // _csrf_token is required for websocket connections
      // and automatically added to the query params by the client javascript
      const csrfToken = url.searchParams.get("_csrf_token") ?? "";
      if (csrfToken) {
        return [true, { csrfToken }];
      } else {
        console.warn(`No "_csrf_token" found in query params`);
      }
    }
    return [false, undefined];
  }

  get websocket(): WebSocketHandler<ServerInfo> {
    const router = this.router;
    return {
      open(ws) {
        ws.data.wsHandler = new WsHandler(ws, router, ws.data.csrfToken);
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

  async buildClientJavascript() {
    const file = Bun.file(this.#conf.clientFile);
    if (!file.exists()) {
      throw new Error(`Cannot compile client file. "${this.#conf.clientFile}" does not exist`);
    }
    return await Bun.build({
      entrypoints: [this.#conf.clientFile],
      outdir: this.#conf.clientDir,
    });
  }

  private async loadPublicIndexTemplate(matchedRoute: MatchedRoute, conf: Conf): Promise<string> {
    return await Bun.file(conf.publicDir + "/index.html").text();
  }
}

/**
 * renderHttpView is a helper function to render a View page server.
 * @param matchedRoute the MatchedRoute from the FileSystemRouter
 * @param req the Request object
 * @param pageTemplate the html template for the page
 * @param templateData the data to pass to the page template including the csrf token
 * @param htmlTag optional tag to wrap the View content in, defaults to "div"
 * @returns
 */
async function renderHttpView<T extends object>(
  matchedRoute: MatchedRoute,
  req: Request,
  pageTemplate: string,
  templateData: T,
  htmlTag: string = "div"
): Promise<Response> {
  const { default: View } = await import(matchedRoute.filePath);
  const csrfToken = randomUUID();
  const viewId = randomUUID();
  const view = new View() as BaseView<AnyEvent>;
  const ctx = new HttpViewContext(viewId, new URL(req.url));
  const mountParams: MountEvent = {
    type: "mount",
    _csrf_token: csrfToken,
    _mounts: -1,
    query: matchedRoute.query,
    params: matchedRoute.params,
  };
  // HTTP Lifecycle is: mount => handleParams => render
  await view.mount(ctx, mountParams);
  // check for redirects from mount
  if (ctx.redirectEvent) {
    return Response.redirect(ctx.redirectEvent.to, 302);
  }
  await view.handleParams(ctx, new URL(req.url));
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
  const template = templateFromString(pageTemplate, { content, ...templateData, csrfToken });
  return new Response(template.toString(), {
    headers: {
      "Content-Type": "text/html",
    },
  });
}

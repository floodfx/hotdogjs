import { FileSystemRouter, MatchedRoute, type BunFile, type WebSocketHandler } from "bun";
import cookie from "cookie";
import { randomUUID } from "crypto";
import {
  AnyEvent,
  HttpViewContext,
  MountEvent,
  Template,
  WsHandler,
  html,
  safe,
  templateFromString,
  type BaseView,
  type ComponentContext,
} from "index";
import { URL } from "node:url";
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

  async viewRouter(req: Request) {
    const matchedRoute = this.router.match(req);
    if (matchedRoute) {
      const resolver = this.#conf.pageTemplate ?? this.loadPublicIndexTemplate;
      return renderHttpView(matchedRoute, req, await resolver(matchedRoute, this.#conf), {});
    }
    return null;
  }

  wsRouter(req: Request): [boolean, { csrfToken: string } | undefined] {
    const url = new URL(req.url);
    if (url.pathname === "/live/websocket") {
      // get csrf token from cookie
      const csrfToken = cookie.parse(req.headers.get("cookie") ?? "").__csrf_token;
      return [true, { csrfToken }];
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
    return Bun.file(publicDir + "/" + name);
  }

  async buildClientJavascript() {
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
async function renderHttpView<T extends any>(
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
  if (ctx.redirect) {
    return Response.redirect(ctx.redirect.to, 302);
  }
  await view.handleParams(ctx, new URL(req.url));
  // check for redirects from handleParams
  if (ctx.redirect) {
    // @ts-ignore - ts wrongly thinks redirect is undefined
    return Response.redirect(ctx.redirect.to, 302);
  }

  // render to get the components into preloaded state
  var tmpl = await view.render({ csrfToken: csrfToken, uploads: ctx.uploadConfigs });

  // if no components then no `preload` and we can return the template now
  if (view.__preloadComponents.length === 0) {
    return renderTmpl(tmpl, pageTemplate, templateData, htmlTag, viewId, csrfToken);
  }

  // otherwise, we need to preload the components, and rerender
  // in order to get the fully rendered template
  view.__preloadComponents(ctx);

  const cCtx: ComponentContext<AnyEvent> = {
    parentId: ctx.id,
    connected: false,
    dispatchEvent: (event: AnyEvent) => {
      ctx.dispatchEvent(event);
    },
    pushEvent: (pushEvent: AnyEvent) => {
      ctx.pushEvent(pushEvent);
    },
  };

  // replace `component` method with one that returns the preloaded component
  // kinda hacky but it works...
  var cidIndex = 0;
  view.component = (c) => {
    const cid = ++cidIndex;
    // little slow but want to make sure we get the right component
    const comp = view.__components.find((c) => c.cid === cid)!;
    comp.mount(cCtx);
    comp.update(cCtx);
    return comp.render();
  };
  // rerun render to get the components into the template
  tmpl = await view.render({ csrfToken: csrfToken, uploads: ctx.uploadConfigs });
  return renderTmpl(tmpl, pageTemplate, templateData, htmlTag, viewId, csrfToken);
}

function renderTmpl<T>(
  tmpl: Template,
  pageTemplate: string,
  templateData: T,
  htmlTag: string,
  viewId: string,
  csrfToken: string
) {
  // TODO: implement tracking of statics
  const content = html`<${htmlTag} data-phx-main="true" data-phx-session="" data-phx-static="" id="phx-${viewId}">
    ${safe(tmpl)}
  </${htmlTag}>`;
  const template = templateFromString(pageTemplate, { content, ...templateData, csrfToken });

  const csrfCookie = cookie.serialize("__csrf_token", csrfToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/", // scope to root of domain
  });

  return new Response(template.toString(), {
    headers: {
      "Set-Cookie": csrfCookie,
      "Content-Type": "text/html",
    },
  });
}

import { BunFile, FileSystemRouter, type BuildOutput, type MatchedRoute, type WebSocketHandler } from "bun";
import { randomUUID } from "crypto";
import { watch, type FSWatcher } from "fs";
import { URL } from "url";
import { html, safe, templateFromString } from "../template";
import { HttpViewContext } from "../view/context";
import type { AnyEvent, BaseView, MountEvent } from "../view/view";
import { WsHandler, type WsHandlerOptions } from "../ws/handler";
import type { Conf } from "./conf";

export type ServerInfo = {
  csrfToken: string;
  wsHandler: WsHandler<any, any>;
};

/**
 * RequestDataExtractor is a function that extracts data from a request.
 * @param r the request
 * @returns the data from the request
 */
export type RequestDataExtractor<R extends object> = (r: Request) => Promise<R>;

/**
 * emptyRequestDataExtractor is a default RequestDataExtractor that returns an empty object,
 * that is, does not extract any data from the request.
 */
const emptyRequestDataExtractor: RequestDataExtractor<any> = async () => ({});

/**
 * Server handles routing and rendering HTTP and WebSocket requests for HotdogJS.
 */
export class Server {
  #conf: Conf;
  #router?: FileSystemRouter;
  #layoutCache: Map<string, string> = new Map();
  #layoutCacheWatcher: FSWatcher;

  constructor(conf: Conf) {
    this.#conf = conf;
    // watch for changes to layout files and invalidate the cache
    this.#layoutCacheWatcher = watch(conf.layoutsDir, (event, filename) => {
      if (event === "change" && filename) {
        this.#layoutCache.delete(filename);
      }
    });
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

  /**
   * viewRouter is a helper function to route and render `View`s from the `viewsDir` directory.
   * @param req the request
   * @param requestDataExtractor the request data extractor
   * @returns the response or null if the route does not exist
   */
  async viewRouter<R extends object>(
    req: Request,
    requestDataExtractor: RequestDataExtractor<R> = emptyRequestDataExtractor
  ): Promise<Response | null> {
    const matchedRoute = this.router.match(req);
    if (matchedRoute) {
      const url = new URL(req.url);
      const requestData = await requestDataExtractor(req);
      return this.renderHttpView(url, matchedRoute, requestData, this.#conf);
    }
    return null;
  }

  /**
   * wsRouter is a helper function to route and render the main WebSocket connection for HotdogJS.
   * @param req the request
   * @param requestDataExtractor the request data extractor
   * @returns the response or null if the route does not exist
   */
  async wsRouter<R extends object>(
    req: Request,
    requestDataExtractor: RequestDataExtractor<R> = emptyRequestDataExtractor
  ): Promise<[boolean, (R & { csrfToken: string }) | undefined]> {
    const url = new URL(req.url);
    // this pathname is based on the url configured in the client javascript
    if (url.pathname === "/live/websocket") {
      // _csrf_token is required for websocket connections
      // and automatically added to the query params by the client javascript
      const csrfToken = url.searchParams.get("_csrf_token") ?? "";
      if (csrfToken) {
        const requestData = await requestDataExtractor(req);
        return [true, { csrfToken, ...(requestData as R) }];
      } else {
        console.warn(`No "_csrf_token" found in query params`);
      }
    }
    return [false, undefined];
  }

  /**
   * websocket defines the WebSocketHandler that Bun.serve uses to handle WebSocket connections specifically
   * for the main WebSocket connection for HotdogJS.
   * @param options the WebSocketHandler options
   * @returns the WebSocketHandler
   */
  websocket(options?: WsHandlerOptions): WebSocketHandler<ServerInfo> {
    const router = this.router;
    return {
      open(ws) {
        const csrfToken = ws.data.csrfToken;
        // remove csrfToken from ws.data
        const reqData = {
          ...ws.data,
          csrfToken: undefined,
        };
        ws.data.wsHandler = new WsHandler(ws, router, csrfToken, reqData, options);
      },
      async message(ws, message) {
        if (message instanceof Buffer) {
          await ws.data.wsHandler.handleMsgData(message);
          return;
        }
        await ws.data.wsHandler.handleMsgString(message as string);
      },
      close(ws) {
        ws.data.wsHandler?.close();
      },
    };
  }

  /**
   * staticRouter is a helper function to serve static files from the public directory.
   * You can exclude files from being served by adding them to the staticExcludes array
   * in the server configuration or by adding `staticExcludes` to the hotdogjs-conf.toml.
   *
   * TODO - this is pretty hacky but gets the job done for now
   * @param req the request
   * @returns the file to serve or null if the file does not exist
   */
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

  /**
   * maybeBuildClientJavascript optionally builds the client javascript when the server starts.
   * You can skip building the client javascript by setting `skipBuildingClientJS` to true
   * in the server configuration or by adding `skipBuildingClientJS` to the hotdogjs-conf.toml.
   * @returns the build output
   */
  async maybeBuildClientJavascript(): Promise<BuildOutput> {
    if (this.#conf.skipBuildingClientJS) {
      console.log("Skipping client javascript build");
      return { success: true, logs: [], outputs: [] };
    }
    if (!this.#conf.clientJSSourceFile || this.#conf.clientJSSourceFile === "") {
      // resolve client ts file and drop file:// part of the path
      const clientJsPath = (await import.meta.resolve("@hotdogjs/client")).replace("file://", "");
      this.#conf.clientJSSourceFile = clientJsPath;
    }
    console.log("Building client javascript from", this.#conf.clientJSSourceFile);
    const file = Bun.file(this.#conf.clientJSSourceFile);
    if (!file.exists()) {
      throw new Error(`Cannot compile client file. "${this.#conf.clientJSSourceFile}" does not exist`);
    }
    return await Bun.build({
      entrypoints: [this.#conf.clientJSSourceFile],
      outdir: this.#conf.clientJSDestDir,
    });
  }

  private async loadPublicIndexTemplate(matchedRoute: MatchedRoute, conf: Conf): Promise<string> {
    return await Bun.file(conf.layoutsDir + "/default.html").text();
  }

  /**
   * renderHttpView is a helper function to render a View page server.
   * @param url the URL of the request
   * @param matchedRoute the MatchedRoute from the FileSystemRouter
   * @param requestData the request data to pass to the View
   * @param config the server configuration
   * @param templateData the data to pass to the page template (default is empty object)
   * @param htmlTag optional tag to wrap the View content in, defaults to "div"
   * @returns
   */
  private async renderHttpView<R extends object, T extends object>(
    url: URL,
    matchedRoute: MatchedRoute,
    requestData: R,
    config: Conf,
    templateData: T = {} as T,
    htmlTag: string = "div"
  ): Promise<Response> {
    const { default: View } = await import(matchedRoute.filePath);
    const resolver = config.layoutResolver ?? this.loadPublicIndexTemplate;
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
      url: url,
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

    // render to get the components into preloaded state
    const tmpl = await view.render({ csrfToken: csrfToken, uploads: ctx.uploadConfigs });
    const content = html`<${htmlTag} data-phx-main="true" data-phx-session="" data-phx-static="" id="phx-${viewId}">
      ${safe(tmpl)}
    </${htmlTag}>`;

    // use layout from view if defined otherwise use the resolver
    var layout: string;
    if (view.layoutName) {
      if (this.#layoutCache.has(view.layoutName)) {
        layout = this.#layoutCache.get(view.layoutName)!;
      } else {
        // try loading layout and throw error if it doesn't exist
        try {
          layout = await Bun.file(config.layoutsDir + "/" + view.layoutName).text();
          this.#layoutCache.set(view.layoutName, layout);
        } catch (e) {
          throw new Error(`Layout file "${view.layoutName}" does not exist`);
        }
      }
    } else {
      layout = await resolver(matchedRoute, config);
    }

    // finally, render the layout with the content
    const template = templateFromString(layout, { content, ...templateData, csrfToken, websocketBaseUrl });
    return new Response(template.toString(), {
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
}

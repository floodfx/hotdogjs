import type { MatchedRoute } from "bun";

export type ConfOptions = {
  /**
   * Directory where static files are served from and client js is built to.
   * Note: this is relative to server
   * Defaults to "/public"
   */
  publicDir: string;

  /**
   * File where the client side code is located.
   * We use the default client javascript if not provided.
   */
  clientJSSourceFile: string;

  /**
   * Directory where client js should be built to.
   * Defaults to "/public/js"
   *
   */
  clientDestDir: string;

  /**
   * Do not build (or rebuild) client js when starting the server.
   * defaults to false
   */
  skipBuildingClientJS: boolean;

  /**
   * Directory where views are served from relative to the server.
   */
  viewsDir: string;

  /**
   * Prefix required to access static files when referenced from
   * HTML. For example, to access a file at: `/public/img/image.png`
   * the code would use `<img src="/static/img/image.png" />`.
   *
   * Defaults to "/static"
   */
  staticPrefix: string;

  /**
   * Files in public that should not be served as static files. For example,
   * templates that should be rendered by the server.
   *
   * Defaults to ["index.html"]
   */
  staticExcludes: string[];

  /**
   * Directory where layout templates are served from relative to the server.
   * Defaults to "/layouts"
   */
  layoutsDir: string;

  /**
   * A function that defines how to resolve the layout template for a given route.
   * This is useful for customizing the layout template based on the route.
   */
  layoutResolver?: (matchedRoute: MatchedRoute, conf: Conf) => Promise<string>;

  /**
   * Base URL for the websocket (allows websocket to be served from a different domain)
   * Defaults to empty string (e.g. "") which means the websocket is served
   * from the same domain as the server.
   */
  wsBaseUrl: string;
};

/**
 * Configuration for the Hotdog server.
 *
 * Set any or all of the following environment variables to override the configuration:
 * HD_PUBLIC_DIR - overrides publicDir
 * HD_CLIENT_JS_FILE - overrides clientFile
 * HD_CLIENT_JS_DEST_DIR - overrides clientDir
 * HD_SKIP_BUILD_CLIENT_JS - overrides skipBuildingClientJS
 * HD_VIEWS_DIR - overrides viewsDir
 * HD_STATIC_PREFIX - overrides staticPrefix
 * HD_STATIC_EXCLUDES - overrides staticExcludes
 * HD_LAYOUTS_DIR - overrides layoutsDir
 * HD_WS_BASE_URL - overrides wsBaseUrl
 */
export class Conf {
  publicDir: string;
  viewsDir: string;
  clientJSSourceFile: string;
  clientJSDestDir: string;
  skipBuildingClientJS: boolean;
  staticPrefix: string;
  staticExcludes: string[];
  layoutsDir: string;
  layoutResolver?: (matchedRoute: MatchedRoute, conf: Conf) => Promise<string>;
  wsBaseUrl: string;

  constructor(options: Partial<ConfOptions> = {}) {
    this.publicDir = getOrElse("HD_PUBLIC_DIR", options.publicDir ?? process.cwd() + "/public");
    this.viewsDir = getOrElse("HD_VIEWS_DIR", options.viewsDir ?? process.cwd() + "/views");
    this.clientJSSourceFile = getOrElse("HD_CLIENT_JS_FILE", options.clientJSSourceFile ?? "");
    this.clientJSDestDir = getOrElse("HD_CLIENT_JS_DEST_DIR", options.clientDestDir ?? this.publicDir + "/js");
    this.skipBuildingClientJS = getOrElse("HD_SKIP_BUILDING_CLIENT_JS", options.skipBuildingClientJS ?? false);
    this.staticPrefix = getOrElse("HD_STATIC_PREFIX", options.staticPrefix ?? "/static");
    this.staticExcludes = getOrElse("HD_STATIC_EXCLUDES", options.staticExcludes ?? ["index.html"]);
    this.layoutsDir = getOrElse("HD_LAYOUTS_DIR", options.layoutsDir ?? process.cwd() + "/layouts");
    this.layoutResolver = options.layoutResolver;
    this.wsBaseUrl = getOrElse("HD_WS_BASE_URL", options.wsBaseUrl ?? "");
  }
}

function getOrElse<T extends string | string[] | boolean>(key: string, defaultVal: T): T {
  if (typeof defaultVal === "boolean") {
    return (process.env[key] === "true" || process.env[key] === "1" ? true : defaultVal) as T;
  }
  if (typeof defaultVal === "string") {
    return (process.env[key] ?? defaultVal) as T;
  }
  if (typeof defaultVal === "object" && Array.isArray(defaultVal)) {
    const val = process.env[key];
    if (val !== undefined) {
      return val.split(",") as T;
    }
    return defaultVal as T;
  }
  return (process.env[key] ?? defaultVal) as T;
}

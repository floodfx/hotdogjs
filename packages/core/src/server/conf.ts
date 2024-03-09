import type { MatchedRoute } from "bun";

export type ConfOptions = {
  /**
   * Directory where static files are served from and client js is built to.
   * Note: this is relative to server
   * Defaults to "/public"
   */
  publicDir: string;

  /**
   * Directory where client js should be built to.
   *
   */
  clientDir: string;

  /**
   * Directory where pages are served from.
   */
  pagesDir: string;

  /**
   * File where the client side code is located.
   */
  clientFile: string;

  /**
   * Static assets path prefix
   */
  staticPrefix: string;

  /**
   * Files to exclude from static serving
   */
  staticExcludes: string[];

  /**
   * override how the page template is resolved
   */
  pageTemplate?: (matchedRoute: MatchedRoute) => Promise<string>;
};

export class Conf {
  publicDir: string;
  pagesDir: string;
  clientFile: string;
  clientDir: string;
  staticPrefix: string;
  staticExcludes: string[];
  pageTemplate?: (matchedRoute: MatchedRoute, conf: Conf) => Promise<string>;

  constructor(serverImportMeta: ImportMeta, options: Partial<ConfOptions> = {}) {
    const relativeDir = serverImportMeta.dir;
    this.publicDir = options.publicDir ?? relativeDir + "/../public";
    this.pagesDir = options.pagesDir ?? relativeDir + "/pages";
    this.clientFile = options.clientFile ?? relativeDir + "/client/app.ts";
    this.clientDir = options.clientDir ?? this.publicDir + "/js";
    this.staticPrefix = options.staticPrefix ?? "/static";
    this.staticExcludes = options.staticExcludes ?? ["index.html"];
    this.pageTemplate = options.pageTemplate;
  }
}

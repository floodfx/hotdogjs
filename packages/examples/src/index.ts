import { BunFile } from "bun";
import { randomUUID } from "crypto";
import { HotPage, WsHandler } from "hotdogjs-core";

console.log("Bun.main", Bun.main, process.cwd());

type HotdogConf = {
  /**
   * Directory where static files are served from and client js is built to.
   * Note: this is relative to process.cwd()
   * Defaults to "/public"
   */
  publicDir: string;
  /**
   * Directory where hotdogjs pages are served from.
   * Note: this is relative to process.cwd()
   * Defaults to "/src/pages"
   */
  pagesDir: string;
  /**
   * File where the hotdogjs client side code is located.
   * Note: this is relative to process.cwd()
   * Defaults to "/src/client/app.ts"
   */
  clientFile: string;
};

// load hotdog.toml
const cwd = process.cwd();
let hdconf: HotdogConf = {
  publicDir: cwd + "/public",
  pagesDir: cwd + "/src/pages",
  clientFile: cwd + "/src/client/app.ts",
};
try {
  hdconf = await import(cwd + "/hotdog.toml");
} finally {
  // ignore
  console.log("hdconf", hdconf);
}

// build clientjs
Bun.build({
  entrypoints: [hdconf.clientFile],
  outdir: hdconf.publicDir + "/js",
});

// load public/index.html
const indexHtmlFile = await Bun.file(import.meta.dir + "/../public/index.html").text();
if (!indexHtmlFile) {
  throw new Error("index.html not found");
}

// setup page router
const router = new Bun.FileSystemRouter({
  style: "nextjs",
  dir: import.meta.dir + "/pages",
});

type HotdogInfo = {
  csrfToken: string;
  wsHandler: WsHandler<any>;
};

const server = Bun.serve<HotdogInfo>({
  async fetch(req, server) {
    const url = new URL(req.url);
    // look for static routes first, e.g. /public/js/app.js
    const s = staticFile(url);
    if (s) {
      return new Response(s);
    }

    // handle hotdogjs page routes
    const matchedRoute = router.match(req);
    if (matchedRoute) {
      const csrfToken = randomUUID();
      const res = await HotPage(matchedRoute, req, indexHtmlFile, { csrfToken });
      if (res instanceof Response) {
        return res;
      }
      return new Response(res.toString(), {
        headers: {
          "Content-Type": "text/html",
          "Set-Cookie": `csrf_token=${csrfToken}; Path=/; HttpOnly; SameSite=Strict`,
        },
      });
    }

    // hotdogjs websocket routes
    if (url.pathname === "/live/websocket") {
      // get csrf token from cookie
      const csrfToken = req.headers
        .get("cookie")
        ?.split(/;\s+/)
        .find((c) => c.startsWith("csrf_token="))
        ?.split("=")[1];
      const success = server.upgrade(req, {
        data: {
          csrfToken,
        },
      });
      if (success) {
        return new Response("Upgraded", { status: 101 });
      }
      throw new Error(`Failed to upgrade socket request: ${req}`);
    }

    // 404 for everything else
    return new Response("Not found", { status: 404 });
  },
  error(e) {
    console.error(e);
    return new Response("Internal server error", { status: 500 });
  },
  websocket: {
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
  },
});

// TODO walk directories in public and look for URLs that
// start with those directories.  Or do we include everything other
// thank index.html?  Should it be hotdog.html instead of index.html?
function staticFile(url: URL): BunFile | null {
  // skip non-static files
  if (!url.pathname.startsWith("/static/")) {
    return null;
  }
  // skip /static/index.html since it is a template
  if (url.pathname === "/static/index.html") {
    return null;
  }
  let name = url.pathname.split("/").slice(2).join("/");
  name = name.replace(/\.\./g, ""); // remove any directory traversal
  return Bun.file(import.meta.dir + "/../public/" + name);
}

console.log(`Listening on http://${server.hostname}:${server.port}`);

import { BunFile } from "bun";
import { randomUUID } from "crypto";
import { HotPage, WsHandler } from "hotdogjs-core";

type HotdogConf = {
  /**
   * The directory where static files are served from.
   * Defaults to "public"
   */
  publicDir: string;
  /**
   * The directory where uploads are stored.
   * Defaults to "uploads"
   */
  uploadDir: string;
};

// load hotdog.toml
try {
  const hdconf = await import("../hotdog.toml");
  console.log("hdconf", hdconf);
} catch (e) {
  console.warn("no hdconf");
}

// build clientjs
Bun.build({
  entrypoints: [import.meta.dir + "/client/app.ts"],
  outdir: import.meta.dir + "/../public/js",
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

console.log("process.env.MY_FOO", process.env.MY_FOO);

const server = Bun.serve<HotdogInfo>({
  async fetch(req, server) {
    const url = new URL(req.url);
    // static files
    const s = staticFile(url);
    if (s) {
      return new Response(s);
    }

    // page routes
    const m = router.match(req);
    if (m) {
      // handle http live view
      console.log("match", m);
      const csrfToken = randomUUID();
      const res = await HotPage(m, req, indexHtmlFile, { csrfToken });
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

    // websocket routes
    if (url.pathname === "/live/websocket") {
      // get csrf token from cookie
      const csrfToken = req.headers
        .get("cookie")
        ?.split(/;\s+/)
        .find((c) => c.startsWith("csrf_token="))
        ?.split("=")[1];
      console.log("csrfToken", csrfToken);
      const success = server.upgrade(req, {
        data: {
          sessionId: 0,
          csrfToken,
        },
      });
      if (success) {
        return undefined;
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
    message(ws, message) {
      if (message instanceof Buffer) {
        ws.data.wsHandler.handleMsgData(message);
        return;
      }
      ws.data.wsHandler.handleMsgString(message);
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
  if (!url.pathname.startsWith("/static/")) {
    return null;
  }
  let name = url.pathname.split("/").slice(2).join("/");
  name = name.replace(/\.\./g, ""); // remove any directory traversal
  return Bun.file(import.meta.dir + "/../public/" + name);
}

console.log(`Listening on http://${server.hostname}:${server.port}`);

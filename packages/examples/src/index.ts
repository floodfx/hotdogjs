import { Conf, Server, type ServerInfo } from "hotdogjs-core";

// configure server and build client js
const conf = new Conf(import.meta);
const server = new Server(conf);
// build client js when starting (or move this to a build step)
await server.buildClientJavascript();

// start the bun server
const webServer = Bun.serve<ServerInfo>({
  async fetch(req, webServer) {
    // view routes
    const v = await server.viewRouter(req);
    if (v) {
      return v;
    }

    // websocket routes
    const [found, data] = await server.wsRouter(req);
    if (found) {
      const success = webServer.upgrade(req, { data });
      if (success) {
        return new Response("Upgraded", { status: 101 });
      }
      throw new Error(`Failed to upgrade socket request: ${req}`);
    }

    // public static files
    const s = server.staticRouter(req);
    if (s) {
      return new Response(s);
    }

    // 404 for everything else
    return new Response("Not found", { status: 404 });
  },
  error(e) {
    console.error(e);
    return new Response("Internal server error", { status: 500 });
  },

  // handle websocket connections
  websocket: server.websocket,

  // web server options
  hostname: process.env.HOSTNAME || "localhost",
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  maxRequestBodySize: 1024 * 1024 * 50, // 50mb
});

console.log(`🌭 Listening on http://${webServer.hostname}:${webServer.port}`);

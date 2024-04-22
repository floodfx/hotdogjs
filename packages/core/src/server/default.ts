import type { Serve } from "bun";
import { Conf, type ConfOptions } from "./conf";
import { Server, type ServerInfo } from "./server";

// override config if hotdog.toml exists
const hdTomlUrl = process.cwd() + "/hotdogjs-conf.toml";
const hdToml = Bun.file(hdTomlUrl);
var confOpts: Partial<ConfOptions> = {};
if(await hdToml.exists()) {
  const toml = await import(hdTomlUrl)
  confOpts = toml;
}

// configure server and build client js
const conf = new Conf(import.meta, confOpts);

const server = new Server(conf);
// build client js when starting (or move this to a build step)
const build = await server.buildClientJavascript();
if (!build.success) {
  console.error("Failed to build client js", build.logs);
  throw new Error("Failed to build client js");
}

// default configuration for the server
export const defaultServeConfig = {
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
  websocket: server.websocket(),

  // web server options
  hostname: process.env.HOSTNAME || "localhost",
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  maxRequestBodySize: process.env.MAX_REQUEST_BODY_SIZE ? parseInt(process.env.MAX_REQUEST_BODY_SIZE) : 1024 * 1024 * 50, // 50mb
} as Serve<ServerInfo>;


/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

/**
 * This is the file that (when compiled) is loaded in the browser and
 * is responsible for setting up the Socket and LiveView configuration.
 */

import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "topbar";
import { S3 } from "./s3uploader";

// Read Configuration from the meta tags in the HTML
let csrfToken = document.querySelector("meta[name='csrf-token']")?.getAttribute("content");
let wsBaseURL = document.querySelector("meta[name='websocket-base-url']")?.getAttribute("content") ?? "";
let barColor = document.querySelector("meta[name='progress-bar-color']")?.getAttribute("content") ?? "#555555";
let shadowColor =
  document.querySelector("meta[name='progress-bar-shadow-color']")?.getAttribute("content") ?? "#0000004d";

// Configure LiveSocket
let url = wsBaseURL + "/live";
let liveSocket = new LiveSocket(url, Socket, {
  // pass the csrf token when connecting
  params: { _csrf_token: csrfToken },
  // change default binding prefix
  bindingPrefix: "hd-",
  // add S3 uploader
  uploaders: { S3 },
});

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: barColor }, shadowColor: shadowColor });
window.addEventListener("phx:page-loading-start", () => topbar.show());
window.addEventListener("phx:page-loading-stop", () => topbar.hide());

// connect if there are any LiveViews on the page
liveSocket.connect();

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
(window as any).liveSocket = liveSocket;

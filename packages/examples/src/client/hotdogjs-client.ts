/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

/**
 * This is the file that (when compiled) is loaded in the browser and
 * is responsible for setting up the Socket and LiveView configuration.
 */

import "phoenix_html";
// Establish Phoenix Socket and LiveView configuration.
import { S3 } from "@hotdogjs/client/s3uploader";
import { Socket } from "phoenix";
import { LiveSocket } from "phoenix_live_view";
import topbar from "topbar";
import { Confetti } from "./hooks/confetti";
import { Modal } from "./hooks/modal";

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
  // add hooks
  hooks: { Confetti, Modal },
});

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: barColor }, shadowColor: shadowColor });
window.addEventListener("phx:page-loading-start", () => topbar.show());
window.addEventListener("phx:page-loading-stop", () => topbar.hide());

// add event listener for generic js-exec events from server
// this works by adding a data attribute to the element with the js to execute
// and then triggering a custom event with the selector to find the element
// see: https://fly.io/phoenix-files/server-triggered-js/
window.addEventListener("phx:js-exec", (e: Event) => {
  console.log("phx:js-exec", e);
  const detail = (e as CustomEvent).detail;
  document.querySelectorAll(detail.to).forEach((el) => {
    liveSocket.execJS(el, el.getAttribute(detail.attr));
  });
});

// connect if there are any LiveViews on the page
liveSocket.connect();

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
(window as any).liveSocket = liveSocket;

# 🌭 Hotdog

What goes well with [Bun](https://bun.sh)?  Hotdogs!

Hotdogjs is a server-side front-end framework built specifically for [Bun](https://bun.sh).  Hotdogjs supports both server rendering and client inteactivity in a single programming model that is a departure from the decade old Single Page Application (SPA) model popularized by React.  Hotdogjs is built on the following principles:
 * **Server-side rendering** - HTML is rendered on the server and sent to the client
 * **Client-side interactivity** - client-side interactivity is achieved by sending client-events to the server, updating the server state, and repling with diffs to the client which updates the DOM which results in very small payloads in both directions, resulting in a much faster user experience
 * **No client-side routing** - we use the browser's native routing along server-side routing to determine the page to render
 * **No client-side state management** - state is managed on the server so there is no need for a client-side state management library or synchronization which is a common source of complexity, slowness, and bugs
 * **No client-side data fetching** - data is always fetched on the server and applied to the state there which is faster and more secure (no need to expose APIs to the client or worry about CORS)
 * **No virtual DOM** - Templates are based on tagged template literals which allows us to only consider parts of the template that can change rather than the full DOM tree.  There is no need to diff the entire DOM tree, only the parts that can change which is much faster.
 * **No JSX** - no JSX transpiling, JSX runtime, or additional javascript to download.  The client-side code is always the same, small size.
 * **No Typescript compilation** - TypeScript is executed directly by Bun

## How is Hotdogjs different from other frameworks?
 * Built specifically to take advantage of [Bun](https://bun.sh)
   * Bun is a server runtime (i.e. not a browser runtime) which means if you want to take advantage of its speed you need a framework that is built specifically for the server not for browsers.  Hotdogjs is that framework.
 * Not an Single Page Application (SPA) framework which means:
    * No client side routing - we use the browser's native routing
    * No client side state management - state is managed on the server
    * No client side data fetching - data is always fetched on the server and either rendered in the HTML or passed via diffs to the client
    * No virtual DOM - we use the native DOM and only morph the elements that have changed since last state change
    * Page loads are extremely fast - no need to download a large JavaScript bundle
    * No JSX - only HTML and TypeScript, no JSX transpiling
    * No Typescript compilation - TypeScript is executed directly by Bun

## Why Bun?
Bun is fast as heck and, while is compatable with nodejs APIs, it offers Bun specific APIs that are orders of magnitude faster than other runtimes. This project seeks to take advantage of Bun in its entirety. Bun builds, bundles, transpiles, etc without dependencies on any other tools which is extremely attractive. Specific list of great things about Bun for Hotdogjs:
 * Bun [directly executes TypeScript](https://bun.sh/docs/runtime/typescript#running-ts-files) without transpiling
 * Native HTTP Server
   * pub to all ws
 * Native Websockets
   * pub/sub?
 * Native Pub/Sub
 * Native FileSystemRouter
 * Bun.build for compiling and bundling client-side code
 * and other things that might be interesting to Hotdogjs including:
   * HTMLRewriter
   * Web Workers

## Why should you use Hotdogjs?

## Why should you NOT use Hotdogjs?
 * Hotdogjs is not ideal for static sites. It requires a server to run 



To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

# 🌭 Hotdog JS

What goes well with [Bun](https://bun.sh)? Hotdogs! 🌭🌭🌭

Hotdogjs is a LiveView web framework built specifically for [Bun](https://bun.sh).

Hotdogjs's key features are:
 * Super-fast http and websocket communication (thanks to Bun)
 * Real-time, multi-player out of the box
 * Built-in ergonomics for form validation, file uploads with progress
 * Server-side state management with automatic client-side updates
 * Automatic, performant, diff-based communication protocol
 * LiveView per file with file-based routing
 * Hot reloading based development with no compilation

## How does Hotdogjs work?
At a high level, LiveViews automatically detect registered events (clicks, form updates, etc.) and routes these events (and metadata) from client to server over a websocket.  When the server receives an event, it routes it to a developer defined handler which can update the server state and kicks off a re-render.  The server then calculates a view diff and sends this diff back to the client which is automatically applied to the DOM.

All of the complicated stuff (communication protocol, websocket lifecycle, state management, diff calculation and application, etc.) is handled automatically by Hotdogjs.  The developer only needs to focus on the business logic of their application using the simple, yet powerful programming paradigm of LiveViews.

## What type of projects is Hotdogjs best for?
 * Applications with user input like forms, AI-chat, etc
 * Applications that benefit from real-time updates
 * Applications where multiple users collaborate on the same data
 * Applications with file uploads

## What type of projects is Hotdogjs NOT best for?
 * Static sites

## Quick Start
```bash
bun create hotdogjs my-app
cd my-app
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Anatomy of a Hotdogjs project
 * `public/` - Location of static assets like client-side javascript
 * `views/` - Hotdogjs LiveViews routed based on [File System Router](https://bun.sh/docs/api/file-system-router); all `.ts` files in this directory are expected to be LiveViews
 * `layouts/` - Template for laying out the Views
 * `package.json` - Node.js compatible package.json with required dependencies and default scripts
 * `hotdogjs-conf.toml` - (optional) hotdogjs configuration file for overriding default configuration

### View Routing
A `View` is defined by creating a file in the `views/` directory.  We use Bun's [File System Router](https://bun.sh/docs/api/file-system-router) to route requests to the appropriate `View` and extract path and query parameters that are passed to the `View` as `params` in the `mount` method.  You can override the directory that the `View`s are located in by setting the `viewsDir` option in the `hotdogjs-conf.toml` file.

### Basics of a (Live) View
A `View` is a web page that responds to events, updates its state, and generates HTML diffs. `View`s are initially rendered as HTML over HTTP. Once rendered, the `View` automatically connects to the server via a websocket. When connected, the `View` automatically sends events from the client and receives then automatically applies diffs to the DOM. You should extend `BaseView` to create your own `View`.

### View API
`View` have the following API:
 * `mount` is called once before the `View` is rendered. It is useful for setting up initial state based on request parameters and/or loading data from the server.
 * `handleParams` is called when the URL changes and the `View` is already mounted. This method is useful for updating the state of the `View` based on the new URL including the query parameters and/or route parameters.
 * `handleEvent` is called when an event is received from the client or server. This method is useful for updating the state of the `View` based on the event and is the main way to handle user interactions or server-based events with the `View`.
 * `render` defines the HTML to render for the `View` based on the current state.  This method is called once when the `View` is mounted and again whenever the `View` state changes.
 * `shutdown` is called when the `View` is being shutdown / unmounted.  This method is useful for cleaning up any resources that the `View` may have allocated.
 * `layoutName` is an optional property that can be used to specify the layout to use for the `View`.  If not specified, the `View` will use the `default.html` layout in the `layouts/` directory.


## Components
Components are small, reusable pieces of UI that can be used across multiple `View`s.  You should put components somewhere outside of the `views/` directory so they aren't routed to accidentally.  `Components` can be stateless or stateful and encapsulate their own state in the latter case.  Components are rendered using the `component` method which takes a `Component` class and returns an instance of that class.

### Component API
Components have the following API:
 * `mount` is called once before the `Component` is rendered. It is useful for setting up initial state based on parameters passed to the `Component` from the `View`.  `Component`s with an `id` property are stateful (regardless of if you are actually using state) and those without an `id` are stateless.
 * `update` is called prior to the `render` method for both stateful and stateless `Component`s.  This method is useful for additional business logic that needs to be executed prior to rendering the `Component`.
 * `handleEvent` if your `Component` is stateful (i.e. it has an `id` property), this method must be implemented and is called when an event is received from the client or server. This method is useful for updating the state of the `Component` based on the event and is the main way to handle user interactions or server-based events with the `Component`.
 * `render` defines the HTML to render for the `Component` based on the current state.  This method is called once when the `Component` is mounted and again whenever the `Component` state changes (if it is stateful).
 * `shutdown` is called when the `Component` is being shutdown / unmounted.  This method is useful for cleaning up any resources that the `Component` may have allocated.


## Ejecting a Hotdogjs project
When using the `bun create hotdogjs` command, the generated project comes with a `eject` script that, when run, will generate the basic server configuration, client-side javascript file, `hotdogjs-conf.toml`, and update the `package.json`.  This gives you the ability to customize the project to your liking including full control over the http server and client-side javascript file.

## How is Hotdogjs different from other frameworks?
Hotdogjs supports both server rendering and client interactivity in a single programming model called [LiveView](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html).  Hotdogjs is built on the following principles:
 * **Server-side rendering** - HTML is rendered on the server and sent to the client
 * **Client-side interactivity** - client-side interactivity is achieved by sending client-events to the server, updating the server state, and replying with diffs to the client which updates the DOM which results in very small payloads in both directions, resulting in a much faster user experience
 * **No client-side routing** - we use the browser's native routing along server-side routing to determine the page to render
 * **No client-side state management** - state is managed on the server so there is no need for a client-side state management library or synchronization which is a common source of complexity, slowness, and bugs
 * **No client-side data fetching** - data is always fetched on the server and applied to the state there which is faster and more secure (no need to expose APIs to the client or worry about CORS)
 * **No virtual DOM** - Templates are based on tagged template literals which allows us to only consider parts of the template that can change rather than the full DOM tree.  There is no need to diff the entire DOM tree, only the parts that can change which is much faster.
 * **No JSX** - no JSX transpiling, JSX runtime, or additional javascript to download.  The client-side code is always the same, small size.
 * **No Typescript compilation** - TypeScript is executed directly by Bun

## Configuration / hotdogjs-conf.toml
If you want/need to override the default configuration of a Hotdogjs project, you can do so by creating a `hotdogjs-conf.toml` file in the root of your project.

The following configuration options are supported:
 * `publicDir` - location of the public directory defaults to `public/`
 * `clientFile` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `clientDir` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `skipBuildingClientJS` - whether the server should NOT build the client-side javascript file on startup (defaults to false)
 * `viewsDir` - where to find the views (defaults to `views/`)
 * `staticPrefix` - the prefix for static assets (defaults to `/static`)
 * `staticExcludes` - a comma separated list of static assets to exclude from the build (defaults to empty)
 * `wsBaseUrl` - the base url for the websocket connection (defaults to empty which uses the default websocket url)

Alternatively, you can override the default configuration by setting the following environment variables:
 * `HD_PUBLIC_DIR` - location of the public directory defaults to `public/`
 * `HD_CLIENT_JS_FILE` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `HD_CLIENT_JS_DEST_DIR` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `HD_SKIP_BUILD_CLIENT_JS` - whether the server should NOT build the client-side javascript file on startup (defaults to false)
 * `HD_VIEWS_DIR` - where to find the views (defaults to `views/`)
 * `HD_STATIC_PREFIX` - the prefix for static assets (defaults to `/static`)
 * `HD_STATIC_EXCLUDES` - a comma separated list of static assets to exclude from the build (defaults to empty)
 * `HD_WS_BASE_URL` - the base url for the websocket connection (defaults to empty which uses the default websocket url)

## Roadmap / Known Issues
 * [ ] More documentation 😀
 * [ ] Update to server to use HTTP static routes
 * [ ] `eject` command to generate basic server and client-side javascript files so easier to customize
 * [ ] Better api for `hd-click`, `hd-change`, etc to bind to events in a type-safe way
 * [ ] Better location for layout templates
 * [ ] Better Form API with support for html
 * [ ] Use Bun's html escape
 * [ ] Support Components in template directly rather than `component` method


## Bun features we use
Bun is fast as heck and provides some powerful features out-of-the-box that Hotdogjs takes advantage of.  We specifically lean into Bun features on purpose since this project seeks to take advantage of Bun in its entirety. Below is a list of Bun features that are used in Hotdogjs:
 * Bun [directly executes TypeScript](https://bun.sh/docs/runtime/typescript#running-ts-files) without transpiling
 * Bun [build, bundles, and transpiles](https://bun.sh/docs/bundler) client-side code without dependencies on any other tools
 * Bun [has a native HTTP server](https://bun.sh/docs/api/http)
 * Bun [also supports native websockets](https://bun.sh/docs/api/websockets)
 * Bun [has a native FileSystemRouter](https://bun.sh/docs/api/file-system-router)
 * Bun [makes it easy to scaffold projects](https://bun.sh/docs/cli/bun-create)
 * Bun [supports workspaces](https://bun.sh/docs/install/workspaces) which we use for organizing the project
 * Bun [has a high-performance SQLite driver](https://bun.sh/docs/api/sqlite)
 * Bun [apis for binary data](https://bun.sh/docs/api/binary-data) and [file I/O](https://bun.sh/docs/api/file-io)


## Bun features we don't use yet
 * [Built-in S3 API](https://bun.sh/docs/api/s3)
 * [Built-in PostgreSQL bindings](https://bun.sh/docs/api/sql)


## How is this different from LiveViewJS?
I wrote LiveViewJS too.  Hotdogjs started as a way to learn more about Bun and re-implement LiveViews for the Bun runtime.  The implementation and APIs are similar with some simplifications in Hotdogjs to make it more ergonomic for developers.

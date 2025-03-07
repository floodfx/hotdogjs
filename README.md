# 🌭 Hotdog JS

What goes well with [Bun](https://bun.sh)? Hotdogs! 🌭🌭🌭

Hotdogjs is a LiveView web framework optimized to run on [Bun](https://bun.sh).

Hotdogjs's key features are:
 * Super-fast http and websocket networking
 * Real-time, multi-player out of the box
 * Built-in ergonomics for form validation, file uploads with progress
 * Server-side state management with automatic client-side updates
 * Pressure tested, automatic, and performant diff-based communication protocol
 * Hot-reloading based development with no compilation
 * Enabling devs to have fun and be productive

Github repo: [https://github.com/floodfx/hotdogjs](https://github.com/floodfx/hotdogjs)

**🎁 Feedback is a gift! 🎁**  Please ask questions, report issues, give feedback, etc by [opening an issue](https://github.com/floodfx/hotdogjs/issues).  I love hearing from you!

## How does Hotdogjs work?
At a high level, LiveViews automatically detect registered events (clicks, form updates, etc.) and routes these events (and metadata) from client to server over a websocket.  When the server receives an event, it routes it to a developer defined handler which can update the server state and kicks off a re-render.  The server then calculates a view diff and sends this diff back to the client which is automatically applied to the DOM.

All of the complicated stuff (communication protocol, websocket lifecycle, state management, diff calculation and application, etc.) is handled automatically by Hotdogjs.  The developer only needs to focus on the business logic of their application using the simple, yet powerful programming paradigm of LiveViews.

## What type of projects is Hotdogjs best for?
 * Applications with user input like forms, AI-chat, etc
 * Applications that benefit from real-time updates
 * Applications where multiple users collaborate, take turns, etc

## What type of projects is Hotdogjs NOT best for?
 * Static sites (duh!)


## Quick Start
```bash
bun create hotdogjs
# (follow the prompts)
cd my-hotdogjs-app
bun install
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Recent Talk at DenverScript Feb 25, 2025
[![HotdogJS - A Bun-optimized LiveView Framework](https://img.youtube.com/vi/01OmwJzReL8/0.jpg)](https://www.youtube.com/watch?v=01OmwJzReL8?si=exlufKq05XIQGP5K&t=2791)

[Link to Youtube](https://www.youtube.com/live/01OmwJzReL8?si=exlufKq05XIQGP5K&t=2791)

Thanks to [DenverScript](https://denverscript.com/) for the invite and great community!


## Run the Examples
 * Clone the Hotdogjs repo - `git clone https://github.com/floodfx/hotdogjs`
 * Install dependencies - `cd hotdogjs && bun install`
 * Run the examples - `cd packages/examples && bun dev`

## Anatomy of a Hotdogjs project
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

### Counter View Example
There are many more examples in the `packages/examples` directory but just to get a feel for LiveViews, here is a simple counter example:

```ts
export default class Increment extends BaseView<AnyEvent> {
  count: number = 0;

  handleEvent(ctx: ViewContext, event: AnyEvent) {
    if (event.type === "inc") this.count++;
  }

  render() {
    return html`
      <h3>${this.count}</h3>
      <button hd-click="inc">+</button>
    `;
  }
}
```

## Event Bindings / HTML Attributes
There are four main types of user events that user can trigger:

- Click events
- Form events
- Key events
- Focus events

You can add the following attributes to your HTML elements to send events (and custom data) to the server based on user interactions:

| Binding         | Attribute            | Supported |
| --------------- | -------------------- | --------- |
| Custom Data     | `hd-value-*`        | ✅        |
| Click Events    | `hd-click`          | ✅        |
| Click Events    | `hd-click-away`     | ✅        |
| Form Events     | `hd-change`         | ✅        |
| Form Events     | `hd-submit`         | ✅        |
| Form Events     | `hd-feedback-for`   | ✅        |
| Form Events     | `hd-disable-with`   | ✅        |
| Form Events     | `hd-trigger-action` | ❌        |
| Form Events     | `hd-auto-recover`   | ❌        |
| Focus Events    | `hd-blur`           | ✅        |
| Focus Events    | `hd-focus`          | ✅        |
| Focus Events    | `hd-window-blur`    | ✅        |
| Focus Events    | `hd-window-focus`   | ✅        |
| Key Events      | `hd-keydown`        | ✅        |
| Key Events      | `hd-keyup`          | ✅        |
| Key Events      | `hd-window-keydown` | ✅        |
| Key Events      | `hd-window-keyup`   | ✅        |
| Key Events      | `hd-key`            | ✅        |
| DOM Patching    | `hd-update`         | ✅        |
| DOM Patching    | `hd-remove`         | ❌        |
| Client JS       | `hd-hook`           | ✅        |
| Rate Limiting   | `hd-debounce`       | ✅        |
| Rate Limiting   | `hd-throttle`       | ✅        |
| Static Tracking | `hd-track-static`   | ❌        |


## Components
Components are small, reusable pieces of UI that can be used across multiple `View`s.  You should put components somewhere outside of the `views/` directory so they aren't routed to accidentally.  `Components` can be stateless or stateful and encapsulate their own state in the latter case.  Components are rendered using the `component` method which takes a `Component` class and returns an instance of that class.

### Component API
Components have the following API:
 * `mount` is called once before the `Component` is rendered. It is useful for setting up initial state based on parameters passed to the `Component` from the `View`.  `Component`s with an `id` property are stateful (regardless of if you are actually using state) and those without an `id` are stateless.
 * `update` is called prior to the `render` method for both stateful and stateless `Component`s.  This method is useful for additional business logic that needs to be executed prior to rendering the `Component`.
 * `handleEvent` if your `Component` is stateful (i.e. it has an `id` property), this method must be implemented and is called when an event is received from the client or server. This method is useful for updating the state of the `Component` based on the event and is the main way to handle user interactions or server-based events with the `Component`.
 * `render` defines the HTML to render for the `Component` based on the current state.  This method is called once when the `Component` is mounted and again whenever the `Component` state changes (if it is stateful).
 * `shutdown` is called when the `Component` is being shutdown / unmounted.  This method is useful for cleaning up any resources that the `Component` may have allocated.

## JS Commands
User events (clicks, etc) typically trigger a server-side event which updates the state and
re-renders the HTML. Sometimes you want to update the DOM without (or in addition to) initiating a server round trip.
This is where JS Commands come in.

JS Commands support a number of client-side DOM manipulation function that can be used to update the DOM without a
server round trip. These functions are:

- `add_class` - Add css classes to an element including optional transition classes
- `remove_class` - Remove css classes from an element including optional transition classes
- `toggle_class` - Toggle a css class on an element including optional transition classes
- `set_attribute` - Set an attribute on an element
- `remove_attribute` - Remove an attribute from an element
- `toggle_attribute` - Toggle an attribute on an element
- `show` - Show an element including optional transition classes
- `hide` - Hide an element including optional transition classes
- `toggle` - Toggle the visibility of an element
- `dispatch` - Dispatch a DOM event from an element
- `transition` - Apply transition classes to an element (i.e.,  animate it)
- `push` - Push an event to the LiveView server (i.e.,  trigger a server round trip)
- `navigate` - Navigate to a new URL
- `patch` - Patch the current URL
- `focus` - Focus on an element
- `focus_first` - Focus on the first child of an element
- `pop_focus` - Pop the focus from the element
- `push_focus` - Push the focus to the element
- `exec` - Execute a function at the attribute location

### JS Command Syntax

JS Commands are used in the `render` function as part of the HTML markup:

```ts
render() {
  return <div hd-click="${new JS().push("increment")}">Increment</div>
}
```

### "Chainable" (i.e.,  fluent) Syntax

JS Commands are "chainable" (i.e.,  fluent) so you can chain multiple commands together as needed and they will be
executed in the order they are called:

```ts
render() {
  return <div hd-click="${new JS().hide().push("increment")}">Increment and hide</div>
}
```

## Ejecting a Hotdogjs project
When using the `bun create hotdogjs` command, the generated project comes with a `eject` script that, when run, will generate the basic server configuration, client-side javascript file, `hotdogjs-conf.toml`, and update the `package.json`.  This gives you the ability to customize the project to your liking including full control over the http server and client-side javascript file.

## How is Hotdogjs different from other frameworks?
Hotdogjs supports both server rendering and client interactivity in a single programming model called [LiveView](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html).  Hotdogjs is built on the following principles:
 * **Server-side rendering + diffs** - HTTP returns HTML then diffs are applied to the DOM based on events from the client
 * **Client-side interactivity** - client-side interactivity is achieved by sending client-events to the server, updating the server state, and replying with diffs to the client which updates the DOM which results in very small payloads in both directions, resulting in a much faster user experience
 * **Server routing** - we use the browser's native routing along with server-side routing to determine the view to render
 * **Server state management** - state is managed on the server so there is no need for a client-side state management library or synchronization which is a common source of complexity, slowness, and bugs
 * **No APIs needed** - data is always fetched on the server and applied to the state there which is faster and more secure (no need to expose APIs to the client or worry about CORS)
 * **No virtual DOM** - Templates are based on tagged template literals which allows us to only consider parts of the template that can change rather than the full DOM tree.  There is no need to diff the entire DOM tree, only the parts that can change which is much faster.
 * **No JSX** - no JSX transpiling, JSX runtime, or additional javascript to download.  The client-side code is always the same, small size.
 * **No compilation** - TypeScript is executed directly by Bun, no need to compile it first

## Configuration / hotdogjs-conf.toml
If you want/need to override the default configuration of a Hotdogjs project, you can do so by creating a `hotdogjs-conf.toml` file in the root of your project.

The following configuration options are supported:
 * `publicDir` - location of the public directory defaults to `public/`
 * `layoutsDir` - location of the layouts directory (defaults to `layouts/`)
 * `clientFile` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `clientDir` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `skipBuildingClientJS` - whether the server should NOT build the client-side javascript file on startup (defaults to false)
 * `viewsDir` - where to find the views (defaults to `views/`)
 * `staticPrefix` - the prefix for static assets (defaults to `/static`)
 * `staticExcludes` - a comma separated list of static assets to exclude from the build (defaults to empty)
 * `wsBaseUrl` - the base url for the websocket connection (defaults to empty which uses the default websocket url)

Alternatively, you can override the default configuration by setting the following environment variables:
 * `HD_PUBLIC_DIR` - location of the public directory defaults to `public/`
 * `HD_LAYOUTS_DIR` - location of the layouts directory (defaults to `layouts/`)
 * `HD_CLIENT_JS_FILE` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `HD_CLIENT_JS_DEST_DIR` - location of the client-side javascript file (defaults to empty which uses the default client-side javascript file)
 * `HD_SKIP_BUILD_CLIENT_JS` - whether the server should NOT build the client-side javascript file on startup (defaults to false)
 * `HD_VIEWS_DIR` - where to find the views (defaults to `views/`)
 * `HD_STATIC_PREFIX` - the prefix for static assets (defaults to `/static`)
 * `HD_STATIC_EXCLUDES` - a comma separated list of static assets to exclude from the build (defaults to empty)
 * `HD_WS_BASE_URL` - the base url for the websocket connection (defaults to empty which uses the default websocket url)

## Roadmap / Known Issues
 * [ ] More documentation 😀
 * [ ] More examples 📝
 * [ ] Redis-backed PubSub
 * [ ] Typesafe Event Binding
 * [ ] Add support for `p` element in Tree array diffs
 * [ ] Update to server to use HTTP static routes?
 * [ ] Use Bun's html escape?

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
I wrote [LiveViewJS](https://liveviewjs.com) and got annoying to abstract it in such a way to support Node and Deno.  Bun was intriguing because if its speed and native Typescript support.  Hotdogjs started as a way to learn more about Bun and re-implement LiveViews for the Bun runtime and based on other LiveView implementations I'd learned from along the way.  Overall, the implementation and APIs are similar with lots of simplifications in Hotdogjs to make it more ergonomic and more powerful with almost zero dependencies.

I also wrote or helped write the following LiveView frameworks:
 * [GoLive](https://github.com/canopyclimate/golive)
 * [Undead](https://github.com/floodfx/undead)
 * [LiveViewJS](https://liveviewjs.com)

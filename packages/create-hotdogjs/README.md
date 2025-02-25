# Your HotdogJS Project

This is a [HotdogJS](https://hotdogjs.com) project - [HotdogJS](https://hotdogjs.com) is a Bun-optimized framework for LiveViews.

## Layout
 * `public` - Public / static files and assets (javascript compiled to `public/js`)
 * `views` - Directory for all LiveViews
 * `views/index.ts` - Sample LiveView that loads at http://localhost:3000/
 * `layouts/default.html` - Default layout for all LiveViews

That's it! HotdogJS automatically handles the rest for you.

## Running the project
This project comes with two ways to run the project:
 * `bun dev` - starts the project in development mode (with live reload)
 * `bun run` - starts the project in production mode (without live reload)


## Adding New LiveViews
HotdogJS uses file-based routing, so to add a new LiveView, simply create a new file in the `views` directory with a **default** export that `extends BaseView` and implements the required methods like so:

```typescript
import { html, BaseView } from 'hotdogjs';

export default class MyView extends BaseView<MyEvent> {
  render() {
    return html`
      <h1>Hello, World!</h1>
    `;
  }
}
```

The name of the file will be the route for the LiveView, so `views/my-view.ts` will be available at `http://localhost:3000/my-view`.  You can also use subdirectories to create nested routes. See [FileSystemRouter](https://bun.sh/docs/api/file-system-router) for more details.

## Ejection (for more control)
If you want to configure the Hotdogjs server directly and/or override the default client javascript, you can simply run `bun eject` which will create a copy of the server and client into your project so you can modify them to your heart's content.

## Learn More
To learn more about HotdogJS, visit the [HotdogJS Documentation](https://hotdogjs.com).

This project was created using the `create-hotdogjs` package.

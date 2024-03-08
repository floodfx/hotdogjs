import { MatchedRoute } from "bun";
import { randomUUID } from "crypto";
import {
  AnyEvent,
  HttpViewContext,
  MountEvent,
  Template,
  html,
  safe,
  templateFromString,
  type BaseView,
  type ComponentContext,
} from "index";
import { URL } from "node:url";

/**
 * HotPage is a helper function to render a View page server.
 * @param matchedRoute the MatchedRoute from the FileSystemRouter
 * @param req the Request object
 * @param pageTemplate the html template for the page
 * @param templateData the data to pass to the page template including the csrf token
 * @param htmlTag optional tag to wrap the View content in, defaults to "div"
 * @returns
 */
export async function HotPage<T extends any>(
  matchedRoute: MatchedRoute,
  req: Request,
  pageTemplate: string,
  templateData: T & { csrfToken: string },
  htmlTag: string = "div"
): Promise<Template | Response> {
  const { default: View } = await import(matchedRoute.filePath);
  const viewId = randomUUID();
  const view = new View() as BaseView<AnyEvent>;
  const ctx = new HttpViewContext(viewId, new URL(req.url));
  const mountParams: MountEvent = {
    type: "mount",
    _csrf_token: templateData.csrfToken,
    _mounts: -1,
    query: matchedRoute.query,
    params: matchedRoute.params,
  };
  // HTTP Lifecycle is: mount => handleParams => render
  await view.mount(ctx, mountParams);
  // check for redirects from mount
  if (ctx.redirect) {
    return Response.redirect(ctx.redirect.to, 302);
  }
  await view.handleParams(ctx, new URL(req.url));
  // check for redirects from handleParams
  if (ctx.redirect) {
    // @ts-ignore - ts wrongly thinks redirect is undefined
    return Response.redirect(ctx.redirect.to, 302);
  }

  // render to get the components into preloaded state
  var tmpl = await view.render({ csrfToken: templateData.csrfToken, uploads: ctx.uploadConfigs });

  // if no components then no `preload` and we can return the template now
  if (view.__preloadComponents.length === 0) {
    return renderTmpl(tmpl, pageTemplate, templateData, htmlTag, viewId);
  }

  // otherwise, we need to preload the components, and rerender
  // in order to get the fully rendered template
  view.__preloadComponents(ctx);

  const cCtx: ComponentContext<AnyEvent> = {
    parentId: ctx.id,
    connected: false,
    dispatchEvent: (event: AnyEvent) => {
      ctx.dispatchEvent(event);
    },
    pushEvent: (pushEvent: AnyEvent) => {
      ctx.pushEvent(pushEvent);
    },
  };

  // replace `component` method with one that returns the preloaded component
  // kinda hacky but it works...
  var cidIndex = 0;
  view.component = (c) => {
    const cid = ++cidIndex;
    // little slow but want to make sure we get the right component
    const comp = view.__components.find((c) => c.cid === cid)!;
    comp.mount(cCtx);
    comp.update(cCtx);
    return comp.render();
  };
  // rerun render to get the components into the template
  tmpl = await view.render({ csrfToken: templateData.csrfToken, uploads: ctx.uploadConfigs });
  return renderTmpl(tmpl, pageTemplate, templateData, htmlTag, viewId);
}

function renderTmpl<T>(
  tmpl: Template,
  pageTemplate: string,
  templateData: T & {
    csrfToken: string;
  },
  htmlTag: string,
  viewId: string
) {
  // TODO: implement tracking of statics
  const content = html`<${htmlTag} data-phx-main="true" data-phx-session="" data-phx-static="" id="phx-${viewId}">
    ${safe(tmpl)}
  </${htmlTag}>`;
  return templateFromString(pageTemplate, { content, ...templateData });
}

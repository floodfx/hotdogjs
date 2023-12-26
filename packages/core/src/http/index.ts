import { MatchedRoute } from "bun";
import { randomUUID } from "crypto";
import { AnyEvent, HttpViewContext, MountEvent, Template, View, html, safe, templateFromString } from "index";

export async function HotPage<T extends any>(
  route: MatchedRoute,
  req: Request,
  pageTemplate: string,
  templateData: T & { csrfToken: string }
): Promise<Template | Response> {
  const { default: View } = await import(route.filePath);
  const viewId = randomUUID();
  const view = new View() as View<AnyEvent>;
  const ctx = new HttpViewContext(viewId, new URL(req.url));
  const mountParams: MountEvent = {
    type: "mount",
    _csrf_token: templateData.csrfToken,
    _mounts: -1,
    query: route.query,
    params: route.params,
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
  const tmpl = await view.render();
  // TODO: implement tracking of statics
  const content = html`<div data-phx-main="true" data-phx-session="" data-phx-static="" id="phx-${viewId}">
    ${safe(tmpl)}
  </div>`;
  return templateFromString(pageTemplate, { content, ...templateData });
}

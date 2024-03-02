import { MatchedRoute } from "bun";
import { randomUUID } from "crypto";
import { AnyEvent, HttpViewContext, MountEvent, Template, View, html, safe, templateFromString } from "index";

/**
 * HotPage is a helper function to render a LiveView page in a hotdogjs server.
 * @param matchedRoute the MatchedRoute from the FileSystemRouter
 * @param req the Request object
 * @param pageTemplate the html template for the page
 * @param templateData the data to pass to the page template including the csrf token
 * @param htmlTag optional tag to wrap the LiveView content in, defaults to "div"
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
  const view = new View() as View<AnyEvent>;
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
  const tmpl = await view.render({ csrfToken: templateData.csrfToken, uploads: ctx.uploadConfigs });
  // TODO: implement tracking of statics
  const content = html`<${htmlTag} data-phx-main="true" data-phx-session="" data-phx-static="" id="phx-${viewId}">
    ${safe(tmpl)}
  </${htmlTag}>`;
  return templateFromString(pageTemplate, { content, ...templateData });
}

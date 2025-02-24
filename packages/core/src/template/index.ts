import { JS } from "src/commands/jsCommands";
import { BaseComponent, Component, type ComponentContext } from "src/component/component";
import type { AnyEvent } from "src/view/view";

const ENTITIES: {
  [key: string]: string;
} = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

const ENT_REGEX = new RegExp(Object.keys(ENTITIES).join("|"), "g");

export function join(array: (string | Template)[], separator: string | Template = "") {
  if (array.length <= 0) {
    return new Template([""], []);
  }

  return new Template(["", ...Array(array.length - 1).fill(separator), ""], array);
}

export function safe(value: unknown): Template {
  if (value instanceof Template) {
    return value;
  }
  return new Template([String(value)], []);
}

export function escapehtml(unsafe: unknown): string {
  if (unsafe instanceof Template) {
    return unsafe.toString();
  }
  if (Array.isArray(unsafe)) {
    return join(unsafe, "").toString();
  }
  return String(unsafe).replace(ENT_REGEX, (char) => ENTITIES[char]);
}

// cases
//   1. only statics e.g. html`abc`
//     { s: ['abc'] }
//   2. statics and dynamics e.g. html`ab${1}c` or html`${1}`
//     {'0': '1', s: ['ab', 'c'] } or { 0: '1', s: ['', ''] }
//   3. array of html substring e.g. html`${[1, 2, 3].map(x => html`<a>${x}</a>`)}`
//     { d: [['1'], ['2'], ['3']], s:['<a>''</a>']}
//   4. tree of statics and dymaics e.g. html`${html`${html`${1}${2}${3}`}`}`
// type IndexPart = { [index: string]: string | Parts | number }
// type StaticsPart = { s: readonly string[] }
// type DynamicsPart = { d: (string | Parts)[] }
// type Parts = IndexPart | StaticsPart | DynamicsPart
export type Tree = { [key: string]: unknown };

/**
 * Template is what a `View` returns from its `render` function.
 * It is based on "tagged template literals" and is what allows the framework
 * to minimize the amount of data sent to the client.
 */
export class Template {
  readonly statics: readonly string[];
  readonly dynamics: readonly unknown[];
  readonly isComponent: boolean = false;

  constructor(statics: readonly string[], dynamics: readonly unknown[], isComponent: boolean = false) {
    this.statics = statics;
    this.dynamics = dynamics;
    this.isComponent = isComponent;
  }

  /**
   * Applies a component renderer by mutating the dynamics of the template
   * @param renderer the function to render a component to a template
   */
  private applyComponentRenderer(renderer: (c: Component<any, Template>) => Template) {
    const newDynamics = [...this.dynamics];
    this.dynamics.forEach((d, i) => {
      if (d instanceof BaseComponent) {
        newDynamics[i] = renderer(d as Component<any, Template>);
      }
      if (Array.isArray(d)) {
        newDynamics[i] = d.map((item) => {
          if (item instanceof BaseComponent) {
            return renderer(item as Component<any, Template>);
          }
          // TODO handle more types specifically?
          // e.g. else if(item instanceof Template) {
          else {
            return item;
          }
        });
      }
    });
    // work around readonly array
    (this.dynamics as unknown[]) = newDynamics;
  }

  /**
   * Converts the Template to a tree of parts.
   * @param componentRenderer optional function to render a component to a template or placeholder depending on
   * whether the component is stateful or stateless
   * @returns a tree of parts
   */
  toTree(componentRenderer?: (c: Component<any, Template>) => Template): Tree {
    // add placeholder for components if componentRenderer is provided
    if (componentRenderer) {
      this.applyComponentRenderer(componentRenderer);
    }
    // statics.length should always equal dynamics.length + 1
    if (this.dynamics.length === 0) {
      if (this.statics.length !== 1) {
        throw new Error("Expected exactly one static string for Template" + this);
      }
      // TODO Optimization to just return the single static string?
      // if only statics, return just the statics
      // in fact, only statics / no dymaincs means we
      // can simplify this node and just return the only
      // static string since there can only be one static
      // return this.statics[0];
      return {
        s: this.statics,
      };
    }

    // otherwise walk the dynamics and build the parts tree
    const tree = this.dynamics.reduce((acc: Tree, cur: unknown, index: number) => {
      // Single Template
      if (cur instanceof Template) {
        // handle isComponent case
        if (cur.isComponent) {
          // for `Components`, we only send back a number which
          // is the index of the component in the `c` key
          // the `c` key is added to the parts tree by the
          return {
            ...acc,
            [`${index}`]: Number(cur.statics[0]),
          };
        } else {
          // this isn't a Component, so we need to contine walking
          // the parts tree for this Template including to the children

          // check if parts only has a single static string
          // and if so make that the parts string instead of using
          // the full parts tree
          if (cur.statics.length === 1) {
            return {
              ...acc,
              [`${index}`]: cur.statics[0],
            };
          }
          // if not just a single static then we need to include the
          // full parts tree
          else {
            return {
              ...acc,
              [`${index}`]: cur.toTree(componentRenderer), // recurse to children
            };
          }
        }
      }
      // JS commands
      else if (cur instanceof JS) {
        return {
          ...acc,
          [`${index}`]: escapehtml(cur.toString()),
        };
      }
      // Array of Templates
      else if (Array.isArray(cur)) {
        // if array is empty just return empty string
        if (cur.length === 0) {
          return {
            ...acc,
            [`${index}`]: "",
          };
        }
        // Not an empty array
        else {
          // elements of Array are either: Template or Promise<Template>
          let d: unknown[][] | Promise<unknown[]>[];
          let s: readonly string[] | Promise<readonly string[]>;
          // istanbul ignore next
          if (cur[0] instanceof Promise) {
            // istanbul ignore next
            throw new Error(
              "Promise not supported in Template, try using Promise.all to wait for all promises to resolve."
            );
          } else if (cur[0] instanceof Template) {
            // Note on hardcoded "s" below:
            // the Heex templates in elixir's liveview use a for comprehension
            // (e.g. <=for ... %>...<% end %>) so expects two statics around the
            // array of dynamics inside the for loop. We use array.map
            // (e.g. ${items.map(i => html`...`)}) instead which doesn't have statics
            // so we just hardcode the "s" here to just two empty string for the expected
            // two statics in the equivalent for comprehension
            s = ["", ""];

            // for each element either return component id or template tree
            // TODO handle weird case of coming across some other type
            d = cur.map((c: Template) => {
              if (c.isComponent) {
                return [Number(c.statics[0])];
              } else {
                return [c.toTree(componentRenderer)];
              }
            });

            // TODO there is a "p" element that can be returned here as an optimization
            // around reusing statics across items in the array.  p is a tree where
            // each index is a static from the template tree.  the statics in the template
            // tree can be replaced with the index of the p element.

            return {
              ...acc,
              [`${index}`]: { d, s },
            };
          } else {
            // probably added an array of objects directly
            // e.g. to the dynamic e.g. ${myArray}
            // so just render the object as a string
            console.warn(
              "Unhandled types in array, rendering as string",
              cur.map((c: unknown) => (c instanceof Object ? c.constructor.name : String(c)))
            );
            s = cur.map((c: unknown) => escapehtml(String(c)));
            return {
              ...acc,
              [`${index}`]: s.join(""),
            };
          }
        }
      }
      // Something else we don't know how to render
      else {
        if (cur instanceof Object) {
          console.warn(`Unhandled type, rendering as string: constructor name "${cur.constructor.name}"`);
        }
        // just call to string on it
        return {
          ...acc,
          [`${index}`]: escapehtml(String(cur)),
        };
      }
    }, {} as Tree);

    // appends the statics to the parts tree
    tree["s"] = this.statics;
    return tree;
  }

  /**
   * toString returns an HTML escaped string representation of the Template.
   * @returns an HTML escaped string representation of the Template
   */
  toString(): string {
    // component id index
    let cidIndex = 0;

    const renderComponent = (pid: number, c: Component<AnyEvent, Template>) => {
      // if the component has an id, it is statefull, so set a cid for
      // rendering purposes
      if (c.id) {
        c.cid = ++cidIndex;
      }

      // create a component context for the rendering purposes
      const noopCtx: ComponentContext<AnyEvent> = {
        parentId: pid.toString(),
        connected: false,
        dispatchEvent: (event: AnyEvent) => {
          // no-op
        },
        pushEvent: (pushEvent: AnyEvent) => {
          // no-op
        },
      };

      // run the component mount, update, and render methods
      c.mount(noopCtx);
      c.update(noopCtx);
      return c.render();
    };

    return this.statics.reduce((result, s, i) => {
      const d = this.dynamics[i - 1];

      // handle rendering components
      if (d instanceof BaseComponent) {
        return result + renderComponent(i, d) + s;
      } else if (Array.isArray(d)) {
        const res = d
          .map((item) => {
            if (item instanceof BaseComponent) {
              return renderComponent(i, item);
            }
            // TODO handle more types specifically?
            // e.g. else if(item instanceof Template) {
            else {
              return item.toString();
            }
          })
          .join("");
        return result + res + s;
      }

      // if not a component, just escape the dynamic value
      else {
        return result + escapehtml(d) + s;
      }
    });
  }
}

/**
 * Creates a Template from a tagged template literal escaping unsafe HTML characters.
 * This is the main way to create a Template.
 * @param statics the static strings from the template literal
 * @param dynamics the dynamic values from the template literal
 * @returns a new Template
 */
export function html(statics: TemplateStringsArray, ...dynamics: unknown[]) {
  return new Template(statics, dynamics);
}

/**
 * Creates a Template from a template string and object.
 * This allows templates to be loaded directly from a file or other
 * source not typically supported by tagged template literals.
 * @param template the template string
 * @param data the data to use for the dynamic values
 * @returns a new Template from the template string and object
 */
export function templateFromString(template: string, data: any): Template {
  // first we make a new Function with the keys of the data object and
  // the template string.  Then we call the function with the values of the
  // data object and the html function to get the result.
  const func = new Function(...Object.keys(data), "html", "return html`" + template + "`;");
  return func(...Object.values(data), html);
}

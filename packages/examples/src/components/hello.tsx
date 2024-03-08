import { BaseComponent, BaseJSXComponent, html, type ComponentContext, type Component, type AnyEvent, type Template } from "hotdogjs-core";


export class Hello extends BaseComponent {
  name: string;

  constructor(props: {name: string}) {
    super();
    this.name = props.name;
  }

  preload(cs: Hello[]): Hello[] {
    return cs.map((c) => {
      c.name = c.name.toUpperCase();
      return c;
    });
  }
  
  render() {
    return html`
    <div>
      <h1>Hi ${this.name}</h1>
    </div>
    `;
  }
  
}


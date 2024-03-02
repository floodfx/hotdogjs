import Html from ".";

export default class Name extends Html {
  render = () => this.renderFile(import.meta);
}

import { renderFile } from "hotdogjs";
import Html from ".";

export default class Name extends Html {
  render = () => renderFile(import.meta);
}

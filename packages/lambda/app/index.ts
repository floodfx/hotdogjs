import { defaultServeConfig } from "hotdogjs";
import { handler } from "./ws/lambda-ws-adaptor";

export default {
  ...defaultServeConfig,
  webSocketHandler: handler,
};

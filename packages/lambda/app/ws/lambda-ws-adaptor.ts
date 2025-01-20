import { ApiGatewayManagementApi } from "@aws-sdk/client-apigatewaymanagementapi";
import {
  APIGatewayProxyResultV2,
  APIGatewayProxyWebsocketEventV2,
  Callback,
  Context,
  type APIGatewayProxyWebsocketHandlerV2,
} from "aws-lambda";

class BunLambdaWsAdaptor {
  // remember the event and callback so we can use them when send() is called
  event: APIGatewayProxyWebsocketEventV2;
  callback: Callback<APIGatewayProxyResultV2>;

  constructor(event: APIGatewayProxyWebsocketEventV2, callback: Callback<APIGatewayProxyResultV2<never>>) {
    this.event = event;
    this.callback = callback;
  }

  /**
   * Method called by LiveView to send a message back to the client.  Uses
   * the API Gateway Management API to send the message back to the client
   * based on the connectionId in the event that triggered the Lambda function.
   * @param message the message to send (provided by LiveView)
   * @param errorHandler errorHandler passed by LiveView to be called if there is an error
   */
  send(message: string, errorHandler?: (err: any) => void): void {
    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: this.event.requestContext.domainName + "/" + this.event.requestContext.stage,
    });

    // use the connectionId from the event to send the message back to the client
    const connectionId = this.event.requestContext.connectionId;
    apigwManagementApi
      .postToConnection({ ConnectionId: connectionId, Data: message })
      .then(() => {
        // now that message was sent, use callback to report success
        this.callback(undefined, {
          statusCode: 200,
        });
      })
      .catch((err) => {
        if (errorHandler) {
          errorHandler(err);
        }
        // now that error was handled, use callback to report success
        // TODO should we return an error code here?
        this.callback(undefined, {
          statusCode: 200,
        });
      });
  }
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = (
  event: APIGatewayProxyWebsocketEventV2,
  context: Context,
  callback: Callback<APIGatewayProxyResultV2>
) => {
  console.log("event", event);
  const connectionId = event.requestContext.connectionId;
  context.callbackWaitsForEmptyEventLoop = true;

  // route websocket requests based on the routeKey
  switch (event.requestContext.routeKey) {
    case "$connect":
      callback(null, { statusCode: 200 });
      break;
    case "$disconnect":
      // pass websocket close events to LiveViewJS
      // this._wsRouter.onClose(connectionId);
      callback(null, { statusCode: 200 });
      break;
    default: // case "$default":
      // decode binary data from the client
      const isBinary = event.isBase64Encoded;
      const data = isBinary ? Buffer.from(event.body!, "base64") : event.body;

      // now pass to LiveView to handle
      const adaptor = new BunLambdaWsAdaptor(event, callback);
      // this._wsRouter.onMessage(connectionId, data, adaptor, isBinary);
      callback(null, { statusCode: 200 });
  }
};

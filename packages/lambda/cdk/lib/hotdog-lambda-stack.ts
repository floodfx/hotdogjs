import * as cdk from "aws-cdk-lib";
import * as apig from "aws-cdk-lib/aws-apigatewayv2";
import * as apigExt from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class HotdogLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create bun lambda layer
    const bunLayer = new lambda.LayerVersion(this, "BunLambdaLayer", {
      code: lambda.Code.fromAsset("./bun-lambda/bun-lambda-layer.zip"),
      compatibleRuntimes: [lambda.Runtime.PROVIDED_AL2],
      compatibleArchitectures: [lambda.Architecture.ARM_64],
      description: "Bun is an incredibly fast JavaScript runtime, bundler, transpiler, and package manager.",
    });

    // create an s3 bucket that will store binary files uploaded via the project
    const bucket = new s3.Bucket(this, "Uploads_Bucket", {
      bucketName: "hotdogjs-uploads",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER, // Allow ACLs
      cors: [
        {
          allowedOrigins: ["*"],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
            s3.HttpMethods.HEAD,
          ],
          allowedHeaders: ["*"],
          exposedHeaders: [],
        },
      ],
    });

    // Add bucket policy to allow public access to objects for presigned URLs
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl"],
        resources: [`${bucket.bucketArn}/*`],
        principals: [new iam.AnyPrincipal()],
        // conditions: {
        //   'StringEquals': {
        //     'aws:SecureTransport': 'true' // Enforce HTTPS
        //   }
        // }
      })
    );

    const bucketReadWritePolicy = new iam.PolicyStatement({
      actions: ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl"],
      resources: [bucket.bucketArn + "/*"],
      // conditions: {
      //   StringEquals: {
      //     "aws:SecureTransport": "true", // Enforce HTTPS
      //   },
      // },
    });

    // Create an IAM policy that allows the generation of presigned URLs
    const presignPolicy = new iam.Policy(this, "PresignPolicy", {
      statements: [bucketReadWritePolicy],
    });

    // Attach the policy to a role (or user) that will be generating presigned URLs
    const presignRole = new iam.Role(this, "PresignRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"), // Adjust as needed
    });
    presignRole.attachInlinePolicy(presignPolicy);

    // API Gateway for Websocket requests
    const webSocketApi = new apig.WebSocketApi(this, "WS APIG");

    // Lambda function for Websocket requests
    const bunLambda = new lambda.Function(this, "Bun Lambda HTTP Fn", {
      code: lambda.Code.fromAsset("../app", {
        // bundle the app with bun before deploying
        bundling: {
          image: cdk.DockerImage.fromRegistry("oven/bun"),
          command: ["bash", "-c", "bun i && bun run build && cp -Lr * /asset-output"],
        },
      }),
      handler: "index.fetch",
      layers: [bunLayer],
      runtime: lambda.Runtime.PROVIDED_AL2,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        HD_WS_BASE_URL: webSocketApi.apiEndpoint,
        HD_SKIP_BUILDING_CLIENT_JS: "true",
      },
      initialPolicy: [bucketReadWritePolicy],
    });

    const bunWsLambda = new lambda.Function(this, "Bun Lambda Ws Fn", {
      code: lambda.Code.fromAsset("../app", {
        // bundle the app with bun before deploying
        bundling: {
          image: cdk.DockerImage.fromRegistry("oven/bun"),
          command: ["bash", "-c", "bun i && bun run build && cp -Lr * /asset-output"],
        },
      }),
      handler: "index.webSocketHandler",
      layers: [bunLayer],
      runtime: lambda.Runtime.PROVIDED_AL2,
      environment: {
        BUCKET_NAME: bucket.bucketName,
        HD_WS_BASE_URL: webSocketApi.apiEndpoint,
        HD_SKIP_BUILDING_CLIENT_JS: "true",
      },
      initialPolicy: [bucketReadWritePolicy],
    });

    // Add routes to the Websocket API Gateway after the Lambda function is created
    webSocketApi.addRoute("$connect", {
      integration: new apigExt.WebSocketLambdaIntegration("connect", bunWsLambda),
      returnResponse: true,
    });
    webSocketApi.addRoute("$disconnect", {
      integration: new apigExt.WebSocketLambdaIntegration("disconnect", bunWsLambda),
      returnResponse: true,
    });
    webSocketApi.addRoute("$default", {
      integration: new apigExt.WebSocketLambdaIntegration("default", bunWsLambda),
      returnResponse: true,
    });

    // grant permissions for the Lambda function to send messages back to the client
    webSocketApi.grantManageConnections(bunWsLambda);
    bunWsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["execute-api:ManageConnections", "execute-api:Invoke"],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/*`],
      })
    );

    // Create a log group for API Gateway
    const logGroup = new logs.LogGroup(this, "WebSocketApiLogs", {
      logGroupName: `/aws/apigateway/websocket/${webSocketApi.apiId}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Must do this: https://repost.aws/knowledge-center/api-gateway-cloudwatch-logs
    // Create IAM role for API Gateway logging
    const apiGatewayLoggingRole = new iam.Role(this, "ApiGatewayLoggingRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    // Add permissions to write to CloudWatch Logs
    apiGatewayLoggingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
        ],
        resources: [logGroup.logGroupArn],
      })
    );

    // The stage for the Websocket API Gateway
    const stage = new apig.WebSocketStage(this, "WS APIG Stage", {
      webSocketApi,
      // the stageName must be "websocket" because that is part of the
      // URL that the LiveViewJS client will connect to
      stageName: "live",
      autoDeploy: true,
    });

    // Enable logging by accessing the underlying CfnStage
    const cfnStage = stage.node.defaultChild as cdk.aws_apigatewayv2.CfnStage;
    cfnStage.addPropertyOverride("DefaultRouteSettings", {
      DetailedMetricsEnabled: true,
      LoggingLevel: "INFO",
      DataTraceEnabled: true,
    });

    // Add the logging role ARN to the stage
    cfnStage.addPropertyOverride("AccessLogSettings", {
      DestinationArn: logGroup.logGroupArn,
      Format: JSON.stringify({
        requestId: "$context.requestId",
        ip: "$context.identity.sourceIp",
        caller: "$context.identity.caller",
        requestTime: "$context.requestTime",
        eventType: "$context.eventType",
        routeKey: "$context.routeKey",
        status: "$context.status",
        connectionId: "$context.connectionId",
        error: "$context.error.message",
      }),
    });

    const arnToReadApiGateways = this.formatArn({
      service: "apigateway",
      resource: "/apis",
      account: "", // arn requires empty account for some reason
    });
    bunLambda.addToRolePolicy(
      new iam.PolicyStatement({ actions: ["apigateway:GET"], resources: [arnToReadApiGateways] })
    );
    bunWsLambda.addToRolePolicy(
      new iam.PolicyStatement({ actions: ["apigateway:GET"], resources: [arnToReadApiGateways] })
    );

    // API Gateway for HTTP requests
    const httpApi = new apig.HttpApi(this, "HTTP APIG");

    // Route all requests to the Lambda function
    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apig.HttpMethod.ANY],
      integration: new apigExt.HttpLambdaIntegration("http", bunLambda),
    });

    // print out the LiveViewJS App URL
    new cdk.CfnOutput(this, "URL", { value: httpApi.url! });

    // Add a stack output to show the correct WebSocket URL
    new cdk.CfnOutput(this, "WebSocketURL", {
      value: `${webSocketApi.apiEndpoint}/${stage.stageName}`,
    });
    new cdk.CfnOutput(this, "WebSocketAPIId", {
      value: webSocketApi.apiId,
    });
    new cdk.CfnOutput(this, "WebSocketEndpoint", {
      value: webSocketApi.apiEndpoint,
    });
    new cdk.CfnOutput(this, "WebSocketStageName", {
      value: stage.stageName,
    });
  }
}

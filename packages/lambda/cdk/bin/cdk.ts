#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { HotdogLambdaStack } from "../lib/hotdog-lambda-stack";

const app = new cdk.App();
new HotdogLambdaStack(app, "HotdogLambdaStack");

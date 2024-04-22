#!/usr/bin/env bun --watch

import { defaultServeConfig } from "./default";
import type { ServerInfo } from "./server";
// start the bun server
const webServer = Bun.serve<ServerInfo>(defaultServeConfig);
console.log(`🌭 Listening (and watching 👀) on http://${webServer.hostname}:${webServer.port}`);


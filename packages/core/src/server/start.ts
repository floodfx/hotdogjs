#!/usr/bin/env bun

import { defaultServeConfig } from "./default";
import type { ServerInfo } from "./server";
// start the bun server
const webServer = Bun.serve<ServerInfo>(defaultServeConfig);
console.log(`🌭 Listening on http://${webServer.hostname}:${webServer.port}`);


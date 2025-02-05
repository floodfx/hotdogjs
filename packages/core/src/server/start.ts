#!/usr/bin/env bun

import { defaultServeConfig } from "./default";
// start the bun server
const webServer = Bun.serve(await defaultServeConfig());
console.log(`🌭 Listening on http://${webServer.hostname}:${webServer.port}`);

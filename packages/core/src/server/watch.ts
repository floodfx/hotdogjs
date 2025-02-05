#!/usr/bin/env bun --watch

import { defaultServeConfig } from "./default";
// start the bun server
const webServer = Bun.serve(await defaultServeConfig());
console.log(`🌭 Listening (and watching 👀) on http://${webServer.hostname}:${webServer.port}`);

#!/usr/bin/env node

import { createServer, runServer } from './server/setup.js';
import { attachHandlers } from './server/handlers.js';

async function main(): Promise<void> {
  const server = createServer();
  attachHandlers(server);
  await runServer(server);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});


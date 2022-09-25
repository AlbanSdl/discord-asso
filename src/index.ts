import { config } from "dotenv";

config();

import { syncRoles } from "./discord";
import express from "express";
import logger from "./logger";

const app = express();

// Sync discord server
app.get("/", (_, response) => {
  syncRoles();
  response.status(201).end();
});

try {
  // Listen the API on port 3000 (default)
  app.listen(process.env.SYNC_PORT, () => {
    logger.info(`Listening on port ${process.env.SYNC_PORT}`);
  });
} catch (error) {
  logger.error(error);
}

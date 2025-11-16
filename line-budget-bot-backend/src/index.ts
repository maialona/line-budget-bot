// Entry point: start HTTP server.

import "dotenv/config";
import { createServer } from "./server";

const port = Number(process.env.PORT) || 3000;

async function main() {
  const app = createServer();

  app.listen(port, () => {
    console.log(`[INFO] Server is running on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("[FATAL] failed to start server", err);
  process.exit(1);
});

import { createApp } from "./app.js";
import { config } from "./config.js";
import "./db/index.js";

const app = createApp();
app.listen(config.port, () => {
  console.log(`Property Suite listening on http://localhost:${config.port}`);
  console.log(`Local data: ${config.databasePath}`);
});

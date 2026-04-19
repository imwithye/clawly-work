import { config } from "dotenv";

config({ path: "../../.env" });

import path from "node:path";
import { fileURLToPath } from "node:url";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as dbActivities from "./activities/db";
import * as fileActivities from "./activities/files";
import * as llmActivities from "./activities/llm";
import { TASK_QUEUE, TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } from "./constants";

if (!process.env.OPENROUTER_API_KEY) {
  throw new Error("OPENROUTER_API_KEY is required");
}

async function run() {
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const worker = await Worker.create({
    connection,
    namespace: TEMPORAL_NAMESPACE,
    taskQueue: TASK_QUEUE,
    workflowsPath: path.resolve(__dirname, "./workflows/agent-chat.ts"),
    activities: { ...llmActivities, ...dbActivities, ...fileActivities },
  });

  console.log(`Temporal worker started on task queue: ${TASK_QUEUE}`);
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

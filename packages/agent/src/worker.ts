import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities";

async function run() {
  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
  });

  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: "clawly-work",
    workflowsPath: new URL("./workflows.js", import.meta.url).pathname,
    activities,
  });

  console.log("Temporal worker started");
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

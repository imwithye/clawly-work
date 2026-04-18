import { Client, Connection } from "@temporalio/client";

let client: Client | undefined;

export async function getTemporalClient() {
  if (!client) {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? "localhost:7233",
    });
    client = new Client({ connection, namespace: "default" });
  }
  return client;
}

export async function startGreetingWorkflow(name: string) {
  const c = await getTemporalClient();
  const handle = await c.workflow.start("greetingWorkflow", {
    taskQueue: "clawly-work",
    workflowId: `greeting-${name}-${Date.now()}`,
    args: [name],
  });

  console.log(`Started workflow ${handle.workflowId}`);
  return handle;
}

import { Client, Connection } from "@temporalio/client";
import { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } from "./constants";

let clientPromise: Promise<Client> | undefined;

export function getTemporalClient() {
  if (!clientPromise) {
    clientPromise = Connection.connect({ address: TEMPORAL_ADDRESS }).then(
      (connection) => new Client({ connection, namespace: TEMPORAL_NAMESPACE }),
    );
  }
  return clientPromise;
}

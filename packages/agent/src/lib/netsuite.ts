import { NetsuiteApiClient } from "netsuite-api-client";

const REQUIRED_ENV = [
  "NETSUITE_CLIENT_ID",
  "NETSUITE_CLIENT_SECRET",
  "NETSUITE_TOKEN_ID",
  "NETSUITE_TOKEN_SECRET",
  "NETSUITE_ACCOUNT_ID",
] as const;

let client: NetsuiteApiClient;

function getClient() {
  if (!client) {
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing NetSuite env vars: ${missing.join(", ")}`);
    }
    client = new NetsuiteApiClient({
      consumer_key: process.env.NETSUITE_CLIENT_ID as string,
      consumer_secret_key: process.env.NETSUITE_CLIENT_SECRET as string,
      token: process.env.NETSUITE_TOKEN_ID as string,
      token_secret: process.env.NETSUITE_TOKEN_SECRET as string,
      realm: process.env.NETSUITE_ACCOUNT_ID as string,
    });
  }
  return client;
}

export async function netsuiteGet(
  path: string,
): Promise<{ data: unknown; statusCode: number }> {
  const res = await getClient().request({ method: "GET", path });
  return { data: res.data, statusCode: res.statusCode };
}

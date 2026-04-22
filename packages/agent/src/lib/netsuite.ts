import { NetsuiteApiClient } from "netsuite-api-client";

export type NetsuiteCredentials = {
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
};

function createClient(creds: NetsuiteCredentials) {
  return new NetsuiteApiClient({
    consumer_key: creds.consumerKey,
    consumer_secret_key: creds.consumerSecret,
    token: creds.tokenId,
    token_secret: creds.tokenSecret,
    realm: creds.accountId,
  });
}

export async function netsuiteGet(
  path: string,
  credentials: NetsuiteCredentials,
): Promise<{ data: unknown; statusCode: number }> {
  const client = createClient(credentials);
  const res = await client.request({ method: "GET", path });
  return { data: res.data, statusCode: res.statusCode };
}

export async function netsuitePost(
  path: string,
  body: unknown,
  credentials: NetsuiteCredentials,
): Promise<{ data: unknown; statusCode: number; headers: unknown }> {
  const client = createClient(credentials);
  const res = await client.request({
    method: "POST",
    path,
    body: JSON.stringify(body),
    heads: { "Content-Type": "application/json" },
  });
  return { data: res.data, statusCode: res.statusCode, headers: res.headers };
}

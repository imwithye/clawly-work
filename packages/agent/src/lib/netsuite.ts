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

export async function netsuiteSuiteQL(
  sql: string,
  credentials: NetsuiteCredentials,
  limit = 20,
  offset = 0,
): Promise<{ items: unknown[]; hasMore: boolean; totalResults: number }> {
  const client = createClient(credentials);
  const res = await client.query(sql, limit, offset);
  const data = res as {
    items?: unknown[];
    hasMore?: boolean;
    totalResults?: number;
  };
  return {
    items: data.items ?? [],
    hasMore: data.hasMore ?? false,
    totalResults: data.totalResults ?? 0,
  };
}

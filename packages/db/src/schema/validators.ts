import { z } from "zod/v4";

export const netsuiteCredentialsSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  consumerKey: z.string().min(1, "Consumer Key is required"),
  consumerSecret: z.string().min(1, "Consumer Secret is required"),
  tokenId: z.string().min(1, "Token ID is required"),
  tokenSecret: z.string().min(1, "Token Secret is required"),
  baseUrl: z.string().optional(),
});

export type NetsuiteCredentials = z.infer<typeof netsuiteCredentialsSchema>;

export const credentialsSchemaMap = {
  netsuite: netsuiteCredentialsSchema,
} as const;

export type ConnectorType = keyof typeof credentialsSchemaMap;

export function validateCredentials(type: ConnectorType, data: unknown) {
  return credentialsSchemaMap[type].parse(data);
}

import type { ConnectorType } from "./connector-types";

export type Connector = {
  id: string;
  name: string;
  type: ConnectorType;
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ConnectorType = "netsuite";

export type Capability = "invoice-filling";

export type CredentialField = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
};

export type ConnectorTypeConfig = {
  type: ConnectorType;
  label: string;
  description: string;
  icon: string;
  capabilities: Capability[];
  fields: CredentialField[];
};

export const connectorTypes: ConnectorTypeConfig[] = [
  {
    type: "netsuite",
    label: "NetSuite",
    description: "Oracle NetSuite ERP — Token-Based Authentication",
    icon: "/connectors/netsuite.svg",
    capabilities: ["invoice-filling"],
    fields: [
      {
        key: "accountId",
        label: "Account ID",
        placeholder: "1234567",
      },
      {
        key: "consumerKey",
        label: "Consumer Key",
        placeholder: "Consumer key from integration record",
      },
      {
        key: "consumerSecret",
        label: "Consumer Secret",
        placeholder: "••••••••",
        secret: true,
      },
      {
        key: "tokenId",
        label: "Token ID",
        placeholder: "Access token ID",
      },
      {
        key: "tokenSecret",
        label: "Token Secret",
        placeholder: "••••••••",
        secret: true,
      },
      {
        key: "baseUrl",
        label: "Base URL (optional)",
        placeholder: "https://1234567.suitetalk.api.netsuite.com",
      },
    ],
  },
];

export function getTypeConfig(type: ConnectorType) {
  return connectorTypes.find((t) => t.type === type);
}

export function getTypesWithCapability(capability: Capability) {
  return connectorTypes.filter((t) => t.capabilities.includes(capability));
}

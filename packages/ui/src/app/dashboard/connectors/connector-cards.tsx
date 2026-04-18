import { Icon } from "@iconify/react";
import Image from "next/image";
import { Button } from "@/components/button";
import { getTypeConfig } from "@/lib/connector-types";
import type { Connector } from "./page";

export function ConnectorCards({
  connectors,
  loading,
  onCreate,
  onEdit,
  onDelete,
}: {
  connectors: Connector[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (c: Connector) => void;
  onDelete: (c: Connector) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">
          {connectors.length} connector{connectors.length !== 1 ? "s" : ""}
        </span>
        <Button variant="primary" onClick={onCreate}>
          [+ create connector]
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : connectors.length === 0 ? (
        <div className="border border-border p-8 flex flex-col items-center gap-3 text-center">
          <Icon
            icon="solar:plug-circle-linear"
            width={32}
            className="text-muted"
          />
          <p className="text-sm text-muted">No connectors configured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectors.map((c) => (
            <ConnectorCard
              key={c.id}
              connector={c}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectorCard({
  connector,
  onEdit,
  onDelete,
}: {
  connector: Connector;
  onEdit: (c: Connector) => void;
  onDelete: (c: Connector) => void;
}) {
  const config = getTypeConfig(connector.type);

  return (
    <div className="border border-border p-4 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      <div className="flex items-center gap-3">
        {config && (
          <Image
            src={config.icon}
            alt={config.label}
            width={44}
            height={44}
            className="shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {connector.name}
          </p>
          <p className="text-xs text-muted">
            {config?.label ?? connector.type}
          </p>
        </div>
        <div className="flex items-center gap-1 text-success">
          <Icon icon="solar:check-circle-linear" width={14} />
          <span className="text-xs">connected</span>
        </div>
      </div>

      <div className="border-t border-border pt-3 flex items-center justify-between">
        <p className="text-xs text-muted">
          {connector.credentials.accountId
            ? `Account: ${connector.credentials.accountId}`
            : "Configured"}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" onClick={() => onEdit(connector)}>
            [edit]
          </Button>
          <Button variant="danger" onClick={() => onDelete(connector)}>
            [delete]
          </Button>
        </div>
      </div>
    </div>
  );
}

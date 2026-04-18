import { Icon } from "@iconify/react";
import Image from "next/image";
import type { ReactNode } from "react";
import { getTypeConfig } from "@/lib/connector-types";
import type { Connector } from "@/lib/types";

export function ConnectorCard({
  connector,
  actions,
}: {
  connector: Connector;
  actions?: ReactNode;
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
        {actions ?? (
          <p className="text-xs text-muted">
            {new Date(connector.updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

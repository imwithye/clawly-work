import { Icon } from "@iconify/react";
import { Button } from "@/components/button";
import { ConnectorCard } from "@/components/connector-card";
import type { Connector } from "@/lib/types";

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
              actions={
                <div className="flex items-center gap-1">
                  <Button variant="ghost" onClick={() => onEdit(c)}>
                    [edit]
                  </Button>
                  <Button variant="danger" onClick={() => onDelete(c)}>
                    [delete]
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

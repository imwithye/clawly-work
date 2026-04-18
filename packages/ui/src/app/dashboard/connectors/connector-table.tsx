import { Button } from "@/components/button";
import type { Connector } from "./page";

export function ConnectorTable({
  connectors,
  onCreate,
  onEdit,
  onDelete,
}: {
  connectors: Connector[];
  onCreate: () => void;
  onEdit: (c: Connector) => void;
  onDelete: (c: Connector) => void;
}) {
  return (
    <div className="border border-border h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-sm text-muted">
          {connectors.length} connector{connectors.length !== 1 ? "s" : ""}
        </span>
        <Button variant="primary" onClick={onCreate}>
          [+ create connector]
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <th className="px-4 py-2 text-sm text-muted text-left font-normal">
                name
              </th>
              <th className="px-4 py-2 text-sm text-muted text-left font-normal">
                type
              </th>
              <th className="px-4 py-2 text-sm text-muted text-left font-normal">
                account
              </th>
              <th className="px-4 py-2 text-sm text-muted text-left font-normal">
                updated
              </th>
              <th className="px-4 py-2 text-sm text-muted text-right font-normal" />
            </tr>
          </thead>
          <tbody>
            {connectors.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-sm text-muted text-center"
                >
                  No connectors configured.
                </td>
              </tr>
            ) : (
              connectors.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/50 hover:bg-default/40 transition-colors"
                >
                  <td className="px-4 py-2.5 text-sm whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="px-4 py-2.5 text-sm whitespace-nowrap text-muted">
                    {c.type}
                  </td>
                  <td className="px-4 py-2.5 text-sm whitespace-nowrap text-muted">
                    {c.accountId}
                  </td>
                  <td className="px-4 py-2.5 text-sm whitespace-nowrap text-muted">
                    {c.updatedAt}
                  </td>
                  <td className="px-4 py-2.5 text-sm whitespace-nowrap text-right">
                    <Button variant="ghost" onClick={() => onEdit(c)}>
                      [edit]
                    </Button>
                    <Button variant="danger" onClick={() => onDelete(c)}>
                      [delete]
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

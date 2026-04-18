"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { ConnectorCard } from "@/components/connector-card";
import { PageShell } from "@/components/page-shell";
import { getTypesWithCapability } from "@/lib/connector-types";
import { useConnectors } from "@/lib/use-connectors";

const supportedTypeNames = new Set(
  getTypesWithCapability("invoice-filling").map((t) => t.type),
);

const capabilityFilter = (c: { type: string }) =>
  supportedTypeNames.has(c.type as never);

export default function InvoiceFillingPage() {
  const { connectors, loading } = useConnectors(capabilityFilter);

  return (
    <PageShell
      title="Invoice Filling"
      description="Automate invoice creation and submission."
    >
      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : connectors.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectors.map((c) => (
            <ConnectorCard key={c.id} connector={c} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function EmptyState() {
  return (
    <div className="border border-border p-8 flex flex-col items-center gap-3 text-center">
      <Icon
        icon="solar:document-text-linear"
        width={32}
        className="text-muted"
      />
      <p className="text-sm text-muted">
        No connectors support invoice filling yet.
      </p>
      <p className="text-xs text-muted">
        <Link
          href="/dashboard/connectors"
          className="text-accent hover:underline"
        >
          Add a connector
        </Link>{" "}
        that supports this capability (e.g. NetSuite).
      </p>
    </div>
  );
}

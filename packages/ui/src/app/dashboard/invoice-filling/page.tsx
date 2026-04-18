"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { getTypeConfig, getTypesWithCapability } from "@/lib/connector-types";
import type { Connector } from "../connectors/page";

const supportedTypes = getTypesWithCapability("invoice-filling");
const supportedTypeNames = new Set(supportedTypes.map((t) => t.type));

export default function InvoiceFillingPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnectors = useCallback(async () => {
    const res = await fetch("/api/connectors");
    const data: Connector[] = await res.json();
    setConnectors(data.filter((c) => supportedTypeNames.has(c.type)));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

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

function ConnectorCard({ connector }: { connector: Connector }) {
  const config = getTypeConfig(connector.type);

  return (
    <div className="border border-border p-4 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      <div className="flex items-center gap-3">
        {config && (
          <Image src={config.icon} alt={config.label} width={28} height={28} />
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
        <p className="text-xs text-muted">
          {new Date(connector.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
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

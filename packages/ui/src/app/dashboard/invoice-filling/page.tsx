"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/button";
import { ConnectorSelect } from "@/components/connector-select";
import { FileUpload } from "@/components/file-upload";
import { PageShell } from "@/components/page-shell";
import { Textarea } from "@/components/textarea";
import { getTypesWithCapability } from "@/lib/connector-types";
import { useConnectors } from "@/lib/use-connectors";

const supportedTypeNames = new Set(
  getTypesWithCapability("invoice-filling").map((t) => t.type),
);

const capabilityFilter = (c: { type: string }) =>
  supportedTypeNames.has(c.type as never);

export default function InvoiceFillingPage() {
  const { connectors, loading } = useConnectors(capabilityFilter);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [instructions, setInstructions] = useState("");

  const canSubmit = selectedId && files.length > 0;

  const handleSubmit = () => {
    // TODO: submit to API
  };

  if (loading) {
    return (
      <PageShell
        title="Invoice Filling"
        description="Automate invoice creation and submission."
      >
        <p className="text-sm text-muted">Loading...</p>
      </PageShell>
    );
  }

  if (connectors.length === 0) {
    return (
      <PageShell
        title="Invoice Filling"
        description="Automate invoice creation and submission."
      >
        <div className="flex items-center justify-center h-full">
          <div className="border border-border p-8 flex flex-col items-center gap-3 text-center max-w-sm">
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
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Invoice Filling"
      description="Automate invoice creation and submission."
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6">
          <ConnectorSelect
            label="Connector"
            connectors={connectors}
            value={selectedId}
            onChange={setSelectedId}
          />

          <FileUpload
            label="Purchase Orders"
            files={files}
            onAdd={(f) => setFiles((prev) => [...prev, ...f])}
            onRemove={(i) =>
              setFiles((prev) => prev.filter((_, idx) => idx !== i))
            }
            accept=".pdf,.csv,.xlsx,.xls"
          />

          <Textarea
            id="instructions"
            label="Custom Instructions (optional)"
            placeholder="e.g. Use vendor code V-1234 for all line items, set payment terms to Net 30..."
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />

          <Button
            variant="solid"
            className="w-full py-2.5"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            [start invoice filling]
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

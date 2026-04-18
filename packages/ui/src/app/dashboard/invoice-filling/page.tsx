"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/button";
import { ConnectorSelect } from "@/components/connector-select";
import { FileUpload } from "@/components/file-upload";
import { PageShell } from "@/components/page-shell";
import { Textarea } from "@/components/textarea";
import type { ConnectorType } from "@/lib/connector-types";
import { getTypesWithCapability } from "@/lib/connector-types";
import { useConnectors } from "@/lib/use-connectors";
import { useFileUpload } from "@/lib/use-file-upload";

const supportedTypes = new Set<ConnectorType>(
  getTypesWithCapability("invoice-filling").map((t) => t.type),
);

const capabilityFilter = (c: { type: string }) =>
  supportedTypes.has(c.type as ConnectorType);

export default function InvoiceFillingPage() {
  const { connectors, loading } = useConnectors(capabilityFilter);
  const { files, upload, remove } = useFileUpload();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");

  const allUploaded =
    files.length > 0 && files.every((f) => f.status === "done");
  const canSubmit = selectedId && allUploaded;

  const handleSubmit = () => {
    // TODO: submit to API
  };

  return (
    <PageShell
      title="Invoice Filling"
      description="Automate invoice creation and submission."
    >
      {loading ? (
        <p className="text-sm text-muted">Loading...</p>
      ) : connectors.length === 0 ? (
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
      ) : (
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
              onAdd={upload}
              onRemove={remove}
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
      )}
    </PageShell>
  );
}

"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/button";
import { FileUpload } from "@/components/file-upload";
import { PageShell } from "@/components/page-shell";
import { Textarea } from "@/components/textarea";
import { getTypeConfig, getTypesWithCapability } from "@/lib/connector-types";
import type { Connector } from "@/lib/types";
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

  const handleAddFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // TODO: submit to API
  };

  const canSubmit = selectedId && files.length > 0;

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
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Invoice Filling"
      description="Automate invoice creation and submission."
    >
      <div className="max-w-2xl space-y-6">
        {/* 1. Select Connector */}
        <section>
          <p className="text-xs text-muted uppercase tracking-wider mb-2">
            Connector
          </p>
          <div className="space-y-2">
            {connectors.map((c) => (
              <ConnectorOption
                key={c.id}
                connector={c}
                selected={selectedId === c.id}
                onSelect={() => setSelectedId(c.id)}
              />
            ))}
          </div>
        </section>

        {/* 2. Upload Purchase Orders */}
        <section>
          <FileUpload
            label="Purchase Orders"
            files={files}
            onAdd={handleAddFiles}
            onRemove={handleRemoveFile}
            accept=".pdf,.csv,.xlsx,.xls"
          />
        </section>

        {/* 3. Custom Instructions */}
        <section>
          <Textarea
            id="instructions"
            label="Custom Instructions (optional)"
            placeholder="e.g. Use vendor code V-1234 for all line items, set payment terms to Net 30..."
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </section>

        {/* Submit */}
        <div className="pt-2">
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

function ConnectorOption({
  connector,
  selected,
  onSelect,
}: {
  connector: Connector;
  selected: boolean;
  onSelect: () => void;
}) {
  const config = getTypeConfig(connector.type);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 border text-left cursor-pointer transition-colors ${
        selected
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/30"
      }`}
    >
      <div
        className={`w-4 h-4 border-2 rounded-full flex items-center justify-center shrink-0 ${
          selected ? "border-accent" : "border-muted"
        }`}
      >
        {selected && <div className="w-2 h-2 rounded-full bg-accent" />}
      </div>
      {config && (
        <Image
          src={config.icon}
          alt={config.label}
          width={28}
          height={28}
          className="shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{connector.name}</p>
        <p className="text-xs text-muted">
          {config?.label}
          {connector.credentials.accountId &&
            ` · ${connector.credentials.accountId}`}
        </p>
      </div>
    </button>
  );
}

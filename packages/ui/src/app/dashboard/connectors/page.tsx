"use client";

import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import type { ConnectorType } from "@/lib/connector-types";
import type { Connector } from "@/lib/types";
import { useConnectors } from "@/lib/use-connectors";
import { ConnectorCards } from "./connector-cards";
import { ConnectorModal } from "./connector-modal";
import { DeleteModal } from "./delete-modal";

export type { Connector };

export default function ConnectorsPage() {
  const { connectors, loading, refetch } = useConnectors();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Connector | null>(null);
  const [deleting, setDeleting] = useState<Connector | null>(null);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleEdit = (c: Connector) => {
    setEditing(c);
    setModalOpen(true);
  };

  const handleSave = async (data: {
    name: string;
    type: ConnectorType;
    credentials: Record<string, string>;
  }) => {
    if (editing) {
      await fetch(`/api/connectors/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setModalOpen(false);
    refetch();
  };

  const handleDelete = async () => {
    if (deleting) {
      await fetch(`/api/connectors/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      refetch();
    }
  };

  return (
    <PageShell
      title="Connectors"
      description="Manage external service connections."
    >
      <ConnectorCards
        connectors={connectors}
        loading={loading}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={setDeleting}
      />
      <ConnectorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editing={editing}
      />
      <DeleteModal
        open={!!deleting}
        name={deleting?.name ?? ""}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </PageShell>
  );
}

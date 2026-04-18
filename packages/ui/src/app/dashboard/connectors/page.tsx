"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { ConnectorModal } from "./connector-modal";
import { ConnectorTable } from "./connector-table";
import { DeleteModal } from "./delete-modal";

export type ConnectorType = "netsuite";

export type Connector = {
  id: string;
  name: string;
  type: ConnectorType;
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Connector | null>(null);
  const [deleting, setDeleting] = useState<Connector | null>(null);

  const fetchConnectors = useCallback(async () => {
    const res = await fetch("/api/connectors");
    const data = await res.json();
    setConnectors(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

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
    fetchConnectors();
  };

  const handleDelete = async () => {
    if (deleting) {
      await fetch(`/api/connectors/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      fetchConnectors();
    }
  };

  return (
    <PageShell
      title="Connectors"
      description="Manage external service connections."
    >
      <ConnectorTable
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

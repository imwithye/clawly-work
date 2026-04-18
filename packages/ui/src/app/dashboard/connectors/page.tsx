"use client";

import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { ConnectorModal } from "./connector-modal";
import { ConnectorTable } from "./connector-table";
import { DeleteModal } from "./delete-modal";

export type Connector = {
  id: string;
  name: string;
  type: "netsuite";
  accountId: string;
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
  baseUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const mockData: Connector[] = [
  {
    id: "1",
    name: "Production NetSuite",
    type: "netsuite",
    accountId: "1234567",
    consumerKey: "abc•••••••",
    consumerSecret: "def•••••••",
    tokenId: "ghi•••••••",
    tokenSecret: "jkl•••••••",
    baseUrl: null,
    createdAt: "4/17/2026, 2:32:22 AM",
    updatedAt: "4/17/2026, 7:27:45 PM",
  },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>(mockData);
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

  const handleSave = (
    data: Omit<Connector, "id" | "createdAt" | "updatedAt">,
  ) => {
    if (editing) {
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === editing.id
            ? { ...c, ...data, updatedAt: new Date().toLocaleString() }
            : c,
        ),
      );
    } else {
      setConnectors((prev) => [
        ...prev,
        {
          ...data,
          id: crypto.randomUUID(),
          createdAt: new Date().toLocaleString(),
          updatedAt: new Date().toLocaleString(),
        },
      ]);
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleting) {
      setConnectors((prev) => prev.filter((c) => c.id !== deleting.id));
      setDeleting(null);
    }
  };

  return (
    <PageShell
      title="Connectors"
      description="Manage external service connections."
    >
      <ConnectorTable
        connectors={connectors}
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

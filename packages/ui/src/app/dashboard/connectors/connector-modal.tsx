"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Modal } from "@/components/modal";
import { Select } from "@/components/select";
import type { Connector } from "./page";

type FormData = Omit<Connector, "id" | "createdAt" | "updatedAt">;

const emptyForm: FormData = {
  name: "",
  type: "netsuite",
  accountId: "",
  consumerKey: "",
  consumerSecret: "",
  tokenId: "",
  tokenSecret: "",
  baseUrl: null,
};

export function ConnectorModal({
  open,
  onClose,
  onSave,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
  editing: Connector | null;
}) {
  const [form, setForm] = useState<FormData>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(
        editing
          ? {
              name: editing.name,
              type: editing.type,
              accountId: editing.accountId,
              consumerKey: editing.consumerKey,
              consumerSecret: editing.consumerSecret,
              tokenId: editing.tokenId,
              tokenSecret: editing.tokenSecret,
              baseUrl: editing.baseUrl,
            }
          : emptyForm,
      );
    }
  }, [open, editing]);

  const set = (key: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    onSave(form);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Modal.Header>
        {editing ? "Edit Connector" : "Create Connector"}
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-3">
          <Input
            id="name"
            label="Name"
            placeholder="Production NetSuite"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <Select
            id="type"
            label="Type"
            value={form.type}
            options={[{ value: "netsuite", label: "NetSuite" }]}
            onChange={(e) => set("type", e.target.value as "netsuite")}
          />
          <Input
            id="accountId"
            label="Account ID"
            placeholder="1234567"
            value={form.accountId}
            onChange={(e) => set("accountId", e.target.value)}
          />
          <Input
            id="consumerKey"
            label="Consumer Key"
            placeholder="Consumer key from integration record"
            value={form.consumerKey}
            onChange={(e) => set("consumerKey", e.target.value)}
          />
          <Input
            id="consumerSecret"
            label="Consumer Secret"
            type="password"
            placeholder="••••••••"
            value={form.consumerSecret}
            onChange={(e) => set("consumerSecret", e.target.value)}
          />
          <Input
            id="tokenId"
            label="Token ID"
            placeholder="Access token ID"
            value={form.tokenId}
            onChange={(e) => set("tokenId", e.target.value)}
          />
          <Input
            id="tokenSecret"
            label="Token Secret"
            type="password"
            placeholder="••••••••"
            value={form.tokenSecret}
            onChange={(e) => set("tokenSecret", e.target.value)}
          />
          <Input
            id="baseUrl"
            label="Base URL (optional)"
            placeholder="https://1234567.suitetalk.api.netsuite.com"
            value={form.baseUrl ?? ""}
            onChange={(e) => set("baseUrl", e.target.value || "")}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={onClose}>
          [cancel]
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          {editing ? "[save]" : "[create]"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

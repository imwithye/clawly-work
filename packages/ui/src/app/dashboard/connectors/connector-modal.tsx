"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { Modal } from "@/components/modal";
import type { Connector, ConnectorType } from "./page";
import { connectorTypes } from "./connector-types";
import type { ConnectorTypeConfig } from "./connector-types";

type Step = "select-type" | "form";

export function ConnectorModal({
  open,
  onClose,
  onSave,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: ConnectorType;
    credentials: Record<string, string>;
  }) => void;
  editing: Connector | null;
}) {
  const [step, setStep] = useState<Step>("select-type");
  const [selectedType, setSelectedType] = useState<ConnectorTypeConfig | null>(
    null,
  );
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (editing) {
        const config = connectorTypes.find((t) => t.type === editing.type);
        setSelectedType(config ?? null);
        setName(editing.name);
        setCredentials({ ...editing.credentials });
        setStep("form");
      } else {
        setStep("select-type");
        setSelectedType(null);
        setName("");
        setCredentials({});
      }
    }
  }, [open, editing]);

  const handleSelectType = (config: ConnectorTypeConfig) => {
    setSelectedType(config);
    setCredentials({});
    setStep("form");
  };

  const handleSubmit = () => {
    if (!selectedType) return;
    onSave({
      name,
      type: selectedType.type,
      credentials,
    });
  };

  const handleBack = () => {
    setStep("select-type");
  };

  return (
    <Modal open={open} onClose={onClose}>
      {step === "select-type" ? (
        <>
          <Modal.Header>Select Connector Type</Modal.Header>
          <Modal.Body>
            <div className="space-y-2">
              {connectorTypes.map((config) => (
                <button
                  key={config.type}
                  type="button"
                  onClick={() => handleSelectType(config)}
                  className="w-full flex items-center gap-3 p-3 border border-border hover:border-accent/50 hover:bg-accent/5 transition-colors text-left cursor-pointer"
                >
                  <Image
                    src={config.icon}
                    alt={config.label}
                    width={32}
                    height={32}
                    className="shrink-0"
                  />
                  <div>
                    <p className="text-sm text-foreground font-medium">
                      {config.label}
                    </p>
                    <p className="text-xs text-muted">{config.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onClick={onClose}>
              [cancel]
            </Button>
          </Modal.Footer>
        </>
      ) : (
        <>
          <Modal.Header>
            {editing ? "Edit Connector" : `New ${selectedType?.label} Connector`}
          </Modal.Header>
          <Modal.Body>
            <div className="space-y-3">
              {/* Type indicator */}
              {selectedType && (
                <div className="flex items-center gap-2 pb-3 border-b border-border mb-3">
                  <Image
                    src={selectedType.icon}
                    alt={selectedType.label}
                    width={20}
                    height={20}
                  />
                  <span className="text-xs text-muted">
                    {selectedType.label}
                  </span>
                </div>
              )}
              <Input
                id="name"
                label="Name"
                placeholder={`My ${selectedType?.label} Connection`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {selectedType?.fields.map((field) => (
                <Input
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  type={field.secret ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={credentials[field.key] ?? ""}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              ))}
            </div>
          </Modal.Body>
          <Modal.Footer>
            {!editing && (
              <Button variant="ghost" onClick={handleBack}>
                [back]
              </Button>
            )}
            <Button variant="ghost" onClick={onClose}>
              [cancel]
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editing ? "[save]" : "[create]"}
            </Button>
          </Modal.Footer>
        </>
      )}
    </Modal>
  );
}

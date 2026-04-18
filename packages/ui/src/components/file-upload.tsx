"use client";

import { Icon } from "@iconify/react";
import { useRef } from "react";
import type { UploadedFile } from "@/lib/use-file-upload";
import { Button } from "./button";
import { FieldLabel } from "./field-label";

export function FileUpload({
  files,
  onAdd,
  onRemove,
  accept,
  label,
}: {
  files: UploadedFile[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  accept?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onAdd(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      onAdd(Array.from(e.dataTransfer.files));
    }
  };

  const openPicker = () => inputRef.current?.click();

  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border border-dashed border-border hover:border-accent/50 p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors focus:outline-none focus:border-accent"
      >
        <Icon icon="solar:upload-linear" width={24} className="text-muted" />
        <p className="text-sm text-muted">Drop files here or click to browse</p>
        {accept && <p className="text-xs text-muted/50">{accept}</p>}
      </div>

      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${file.key || i}`}
              className="flex items-center justify-between px-3 py-2 border border-border text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <StatusIcon status={file.status} />
                <span className="truncate">{file.name}</span>
                <span className="text-xs text-muted shrink-0">
                  {formatSize(file.size)}
                </span>
              </div>
              <Button
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                className="shrink-0"
              >
                [remove]
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: UploadedFile["status"] }) {
  switch (status) {
    case "uploading":
      return (
        <Icon
          icon="solar:refresh-linear"
          width={14}
          className="text-muted shrink-0 animate-spin"
        />
      );
    case "done":
      return (
        <Icon
          icon="solar:check-circle-linear"
          width={14}
          className="text-success shrink-0"
        />
      );
    case "error":
      return (
        <Icon
          icon="solar:danger-triangle-linear"
          width={14}
          className="text-danger shrink-0"
        />
      );
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

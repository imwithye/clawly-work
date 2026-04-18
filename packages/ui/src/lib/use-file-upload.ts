import { nanoid } from "nanoid";
import { useCallback, useState } from "react";

export type UploadedFile = {
  id: string;
  key: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
};

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const upload = useCallback(async (newFiles: File[]) => {
    const batch = newFiles.map((f) => ({
      id: nanoid(),
      key: "",
      name: f.name,
      size: f.size,
      status: "uploading" as const,
    }));
    const batchIds = new Set(batch.map((b) => b.id));

    setFiles((prev) => [...prev, ...batch]);

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        files: newFiles.map((f) => ({ name: f.name, type: f.type })),
      }),
    });

    if (!res.ok) {
      setFiles((prev) =>
        prev.map((f) =>
          batchIds.has(f.id) ? { ...f, status: "error" as const } : f,
        ),
      );
      return;
    }

    const presigned: { key: string; url: string; name: string }[] =
      await res.json();

    const results = await Promise.allSettled(
      presigned.map(async (p, i) => {
        await fetch(p.url, {
          method: "PUT",
          headers: { "Content-Type": newFiles[i].type },
          body: newFiles[i],
        });
        return p;
      }),
    );

    setFiles((prev) =>
      prev.map((f) => {
        const batchIndex = batch.findIndex((b) => b.id === f.id);
        if (batchIndex === -1) return f;
        const result = results[batchIndex];
        if (result.status === "fulfilled") {
          return { ...f, key: result.value.key, status: "done" as const };
        }
        return { ...f, status: "error" as const };
      }),
    );
  }, []);

  const remove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
  }, []);

  return { files, upload, remove, reset };
}

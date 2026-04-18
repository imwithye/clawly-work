import { useCallback, useState } from "react";

export type UploadedFile = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
};

export function useFileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const upload = useCallback(
    async (newFiles: File[]) => {
      const placeholders: UploadedFile[] = newFiles.map((f) => ({
        key: "",
        name: f.name,
        size: f.size,
        status: "uploading" as const,
      }));

      setFiles((prev) => [...prev, ...placeholders]);
      const startIndex =
        files.length; /* capture before async to calculate offset */

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
            f.status === "uploading" ? { ...f, status: "error" } : f,
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
        prev.map((f, idx) => {
          const offset = idx - startIndex;
          if (offset < 0 || offset >= results.length) return f;
          const result = results[offset];
          if (result.status === "fulfilled") {
            return { ...f, key: result.value.key, status: "done" as const };
          }
          return { ...f, status: "error" as const };
        }),
      );
    },
    [files.length],
  );

  const remove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const reset = useCallback(() => {
    setFiles([]);
  }, []);

  return { files, upload, remove, reset };
}

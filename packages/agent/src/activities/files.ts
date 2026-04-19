import { chatFiles, db, eq } from "@clawly-work/db";
import { getObject, putObject } from "../lib/s3";

export type ProcessedFile = {
  name: string;
  type: "image" | "text";
  imageKeys?: string[];
  text?: string;
};

function extOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
}

async function processPdf(key: string, name: string): Promise<ProcessedFile> {
  const mupdf = await import("mupdf");
  const buf = await getObject(key);
  const doc = mupdf.Document.openDocument(buf, "application/pdf");
  const pageCount = doc.countPages();
  const imageKeys: string[] = [];

  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const [, , w, h] = page.getBounds();
    // Scale to ~1500px wide for good readability
    const scale = Math.min(1500 / w, 3);
    const pixmap = page.toPixmap(
      [scale, 0, 0, scale, 0, 0],
      mupdf.ColorSpace.DeviceRGB,
      false,
      true,
    );
    const png = pixmap.asPNG();
    const pageKey = `processed/${key}/page-${i}.png`;
    await putObject(pageKey, png, "image/png");
    imageKeys.push(pageKey);
  }

  return { name, type: "image", imageKeys };
}

async function processSpreadsheet(
  key: string,
  name: string,
): Promise<ProcessedFile> {
  const XLSX = await import("xlsx");
  const buf = await getObject(key);
  const workbook = XLSX.read(buf);
  const text = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return workbook.SheetNames.length > 1
      ? `--- Sheet: ${sheetName} ---\n${csv}`
      : csv;
  }).join("\n\n");

  return { name, type: "text", text };
}

async function processCsv(key: string, name: string): Promise<ProcessedFile> {
  const buf = await getObject(key);
  return { name, type: "text", text: buf.toString("utf-8") };
}

async function processImage(key: string, name: string): Promise<ProcessedFile> {
  return { name, type: "image", imageKeys: [key] };
}

export async function processFiles(chatId: string): Promise<ProcessedFile[]> {
  const files = await db
    .select()
    .from(chatFiles)
    .where(eq(chatFiles.chatId, chatId));

  if (files.length === 0) return [];

  const results: ProcessedFile[] = [];

  for (const file of files) {
    const ext = extOf(file.name);
    if (ext === "pdf") {
      results.push(await processPdf(file.key, file.name));
    } else if (ext === "xlsx" || ext === "xls") {
      results.push(await processSpreadsheet(file.key, file.name));
    } else if (ext === "csv") {
      results.push(await processCsv(file.key, file.name));
    } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      results.push(await processImage(file.key, file.name));
    }
  }

  return results;
}

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { S3_BUCKET, s3 } from "@/lib/s3";

export async function POST(request: Request) {
  const body = await request.json();
  const files: { name: string; type: string }[] = body.files;

  if (!files?.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const ext = file.name.split(".").pop() || "";
      const key = `${nanoid()}${ext ? `.${ext}` : ""}`;

      const url = await getSignedUrl(
        s3,
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ContentType: file.type,
        }),
        { expiresIn: 600 },
      );

      return { key, url, name: file.name };
    }),
  );

  return NextResponse.json(results);
}

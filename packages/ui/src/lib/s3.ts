import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "clawly_work",
    secretAccessKey: process.env.S3_SECRET_KEY || "clawly_work",
  },
  forcePathStyle: true,
});

export const S3_BUCKET = process.env.S3_BUCKET || "uploads";

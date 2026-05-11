import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

export type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

const SUPABASE_STORAGE_ENDPOINT = process.env.SUPABASE_STORAGE_ENDPOINT;
const SUPABASE_ACCESS_KEY = process.env.SUPABASE_ACCESS_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;
const SUPABASE_PUBLIC_BASE_URL =
  process.env.SUPABASE_PUBLIC_BASE_URL ??
  (SUPABASE_STORAGE_ENDPOINT
    ? SUPABASE_STORAGE_ENDPOINT.replace(/\/storage\/v1\/s3\/?$/, "/storage/v1/object/public")
    : null);

function requireSupabaseConfig() {
  if (
    !SUPABASE_STORAGE_ENDPOINT ||
    !SUPABASE_ACCESS_KEY ||
    !SUPABASE_SECRET_KEY ||
    !SUPABASE_BUCKET ||
    !SUPABASE_PUBLIC_BASE_URL
  ) {
    throw new Error("Falta configurar Supabase Storage en las variables de entorno");
  }
}

const s3Client = new S3Client({
  region: process.env.SUPABASE_REGION ?? "us-west-2",
  endpoint: SUPABASE_STORAGE_ENDPOINT,
  credentials:
    SUPABASE_ACCESS_KEY && SUPABASE_SECRET_KEY
      ? {
          accessKeyId: SUPABASE_ACCESS_KEY,
          secretAccessKey: SUPABASE_SECRET_KEY,
        }
      : undefined,
  forcePathStyle: true,
});

function getFileExtension(file: UploadedImageFile) {
  return path.extname(file.originalname).toLowerCase();
}

export function getSupabaseObjectKeyFromUrl(resourceUrl: string | null | undefined): string | null {
  if (!resourceUrl || !SUPABASE_PUBLIC_BASE_URL || !SUPABASE_BUCKET) {
    return null;
  }

  try {
    const url = new URL(resourceUrl);
    const publicPrefix = `${new URL(SUPABASE_PUBLIC_BASE_URL).pathname.replace(/\/$/, "")}/${SUPABASE_BUCKET}/`;
    if (!url.pathname.startsWith(publicPrefix)) {
      return null;
    }

    return decodeURIComponent(url.pathname.slice(publicPrefix.length));
  } catch {
    return null;
  }
}

export async function deleteSupabaseObject(resourceUrl: string | null | undefined): Promise<void> {
  requireSupabaseConfig();
  const key = getSupabaseObjectKeyFromUrl(resourceUrl);
  if (!key) {
    return;
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: SUPABASE_BUCKET!,
      Key: key,
    })
  );
}

export async function uploadImageToSupabase(
  file: UploadedImageFile,
  folder: string,
  previousResourceUrl?: string | null
): Promise<{ url: string; key: string }> {
  requireSupabaseConfig();

  const key = `${folder}/${Date.now()}-${randomUUID()}${getFileExtension(file)}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: SUPABASE_BUCKET!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const url = `${SUPABASE_PUBLIC_BASE_URL}/${SUPABASE_BUCKET}/${key}`;

  if (previousResourceUrl) {
    await deleteSupabaseObject(previousResourceUrl).catch(() => undefined);
  }

  return { url, key };
}

export async function uploadVideoToSupabase(
  filePath: string,
  mimetype: string,
  filename: string,
  matchId: number
): Promise<{ url: string; key: string }> {
  requireSupabaseConfig();

  const fs = await import("fs");
  const fileBuffer = fs.readFileSync(filePath);

  const ext = path.extname(filename) || ".mp4";
  const key = `analysis/${matchId}/${Date.now()}-${randomUUID()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: SUPABASE_BUCKET!,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
    })
  );

  const url = `${SUPABASE_PUBLIC_BASE_URL}/${SUPABASE_BUCKET}/${key}`;
  return { url, key };
}
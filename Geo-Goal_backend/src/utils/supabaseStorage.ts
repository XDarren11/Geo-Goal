import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";

export type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
};

const RAW_SUPABASE_STORAGE_ENDPOINT = process.env.SUPABASE_STORAGE_ENDPOINT;
const SUPABASE_ACCESS_KEY = process.env.SUPABASE_ACCESS_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;
const SUPABASE_PROJECT_URL = process.env.SUPABASE_URL;

function normalizeStorageEndpoint(endpoint?: string | null): string | null {
  if (!endpoint) return null;
  const clean = endpoint.replace(/\/+$/, "");
  if (/\/storage\/v1\/s3$/i.test(clean)) return clean;
  if (/\/storage\/v1$/i.test(clean)) return `${clean}/s3`;
  if (/\/storage\/v1\/?/i.test(clean)) return `${clean.replace(/\/+$/, "")}/s3`;
  return `${clean}/storage/v1/s3`;
}

const SUPABASE_STORAGE_ENDPOINT =
  normalizeStorageEndpoint(RAW_SUPABASE_STORAGE_ENDPOINT) ||
  (SUPABASE_PROJECT_URL ? `${SUPABASE_PROJECT_URL.replace(/\/+$/, "")}/storage/v1/s3` : null);

const SUPABASE_PUBLIC_BASE_URL =
  process.env.SUPABASE_PUBLIC_BASE_URL ??
  (SUPABASE_PROJECT_URL
    ? `${SUPABASE_PROJECT_URL.replace(/\/+$/, "")}/storage/v1/object/public`
    : SUPABASE_STORAGE_ENDPOINT
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

/**
 * Descarga un archivo de Supabase a un path local. Para procesarlo en backend
 * y luego volver a subirlo.
 */
export async function downloadVideoFromSupabase(url: string, localPath: string): Promise<void> {
  requireSupabaseConfig();
  const fs = await import("fs");
  const fsp = await import("fs/promises");

  await fsp.mkdir(path.dirname(localPath), { recursive: true });

  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`Supabase devolvió ${r.status} al descargar ${url}`);
  }
  if (!r.body) {
    throw new Error("Respuesta de Supabase sin body");
  }

  const writeStream = fs.createWriteStream(localPath);
  const reader = r.body.getReader();
  await new Promise<void>((resolve, reject) => {
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!writeStream.write(value)) {
            await new Promise<void>((res) => writeStream.once("drain", () => res()));
          }
        }
        writeStream.end(() => resolve());
      } catch (e) {
        writeStream.destroy();
        reject(e);
      }
    };
    pump();
  });
}

/**
 * Reemplaza el contenido de una key existente en Supabase con un archivo local.
 * Útil cuando hacemos re-encoding post-upload directo y queremos sustituir
 * el original sin cambiar la URL pública del job.
 */
export async function replaceSupabaseObject(params: {
  publicUrl: string;
  localPath: string;
  mimetype: string;
}): Promise<void> {
  requireSupabaseConfig();
  const fs = await import("fs");
  const key = getSupabaseObjectKeyFromUrl(params.publicUrl);
  if (!key) {
    throw new Error(`No se pudo extraer la key de Supabase desde ${params.publicUrl}`);
  }

  const fileBuffer = fs.readFileSync(params.localPath);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: SUPABASE_BUCKET!,
      Key: key,
      Body: fileBuffer,
      ContentType: params.mimetype,
    })
  );
}

/**
 * Genera una URL firmada de PUT para que el cliente suba un video directo a Supabase Storage.
 *
 * Beneficio en producción: el video no pasa por el backend (un solo hop del admin a Supabase
 * en lugar de admin → backend → Supabase).
 *
 * El cliente debe hacer:
 *   PUT <uploadUrl>
 *   Content-Type: <mimetype>
 *   body: <bytes del video>
 */
export async function createSignedVideoUploadUrl(params: {
  matchId: number;
  filename: string;
  mimetype: string;
  expiresInSeconds?: number;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  requireSupabaseConfig();

  const ext = path.extname(params.filename) || ".mp4";
  const key = `analysis/${params.matchId}/${Date.now()}-${randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: SUPABASE_BUCKET!,
    Key: key,
    ContentType: params.mimetype,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: params.expiresInSeconds ?? 3600,   // 1 hora por defecto
  });

  const publicUrl = `${SUPABASE_PUBLIC_BASE_URL}/${SUPABASE_BUCKET}/${key}`;

  return { uploadUrl, publicUrl, key };
}
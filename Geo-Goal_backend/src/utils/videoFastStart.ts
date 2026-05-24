/**
 * Re-encoding rápido a "fast-start": mueve el atom `moov` al inicio del MP4.
 *
 * ¿Por qué importa?
 *   - Sin fast-start, OpenCV (cv2.VideoCapture) NO puede hacer streaming HTTP:
 *     debe descargar el archivo completo para encontrar el índice.
 *   - Con fast-start, OpenCV abre el video en 1 request HTTP y luego pide solo
 *     los frames que necesita por HTTP range requests.
 *   - Resultado: el AI service procesa en streaming, sin tocar disco, y empieza
 *     a producir frames decodificados en <1s.
 *
 * Estrategia:
 *   1. Intenta primero `-c copy -movflags +faststart` → SOLO reordena bytes,
 *      no re-codifica. Toma 3-15s para video de 100 MB. Funciona si el codec
 *      es compatible con MP4 (h264, h265, aac, mp3).
 *   2. Si falla (ej. .avi viejo, codec exótico), cae a transcoding completo
 *      con `-c:v libx264 -preset veryfast -movflags +faststart`. Mucho más lento
 *      pero garantizado.
 */
import ffmpegPath from "ffmpeg-static";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

if (!ffmpegPath) {
  console.warn("[fastStart] ffmpeg-static no encontró binario — re-encoding deshabilitado");
}

interface FastStartResult {
  outputPath: string;
  reEncoded: boolean;        // true si tuvo que transcodificar (caso lento)
  durationMs: number;
}

/**
 * Garantiza que el archivo MP4 en `inputPath` quede como fast-start.
 * Devuelve la ruta del archivo optimizado. Puede ser la misma de input si el
 * re-encoding ya creó el output con el mismo nombre.
 *
 * NO borra el input — el caller decide si reemplazar o conservar.
 */
export async function ensureFastStart(inputPath: string): Promise<FastStartResult> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static no disponible — instala el paquete ffmpeg-static");
  }
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Archivo no existe: ${inputPath}`);
  }

  const t0 = Date.now();
  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath, path.extname(inputPath));
  // Siempre salimos en .mp4 (Supabase y OpenCV manejan MP4 de forma óptima)
  const outputPath = path.join(dir, `${base}.faststart.mp4`);

  // --- Intento 1: solo remux (sin re-codificar) ---
  try {
    await runFfmpeg([
      "-y",                       // overwrite si existe
      "-i", inputPath,
      "-c", "copy",               // no transcodificar, solo demux+remux
      "-movflags", "+faststart",  // moov al inicio
      "-loglevel", "error",
      outputPath,
    ]);
    return { outputPath, reEncoded: false, durationMs: Date.now() - t0 };
  } catch (err) {
    console.warn(`[fastStart] remux falló (${(err as Error).message}), intentando transcoding completo`);
    // limpiar archivo parcial si existe
    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
    }
  }

  // --- Intento 2: transcoding (último recurso, lento pero universal) ---
  await runFfmpeg([
    "-y",
    "-i", inputPath,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-loglevel", "error",
    outputPath,
  ]);

  return { outputPath, reEncoded: true, durationMs: Date.now() - t0 };
}

/**
 * Detecta si un MP4 servido en una URL HTTP ya es fast-start, sin descargarlo.
 *
 * Hace un GET con Range: bytes=0-32767 (32 KB) y aplica la misma heurística
 * que `isFastStart` sobre el buffer parcial.
 */
export async function isFastStartUrl(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-32767" } });
    if (!r.ok && r.status !== 206) return false;
    const ab = await r.arrayBuffer();
    const slice = Buffer.from(ab).toString("binary");

    const moovIdx = slice.indexOf("moov");
    const mdatIdx = slice.indexOf("mdat");

    if (moovIdx === -1) return false;
    if (mdatIdx === -1) return true;
    return moovIdx < mdatIdx;
  } catch {
    return false;
  }
}

/**
 * Detecta si un archivo MP4 ya es fast-start sin tocarlo.
 * Útil para saltarse el re-encoding cuando no hace falta.
 *
 * Heurística simple: lee los primeros 32 KB y busca el atom `moov`.
 * Si lo encuentra antes del atom `mdat` → ya es fast-start.
 */
export async function isFastStart(inputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const fd = fs.openSync(inputPath, "r");
      const buf = Buffer.alloc(32 * 1024);
      const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
      fs.closeSync(fd);

      const slice = buf.slice(0, bytesRead).toString("binary");
      const moovIdx = slice.indexOf("moov");
      const mdatIdx = slice.indexOf("mdat");

      if (moovIdx === -1) {
        // Si no aparece moov en los primeros 32 KB, casi seguro está al final
        resolve(false);
        return;
      }
      if (mdatIdx === -1) {
        // moov sí, mdat no → moov está antes (fast-start)
        resolve(true);
        return;
      }
      resolve(moovIdx < mdatIdx);
    } catch {
      resolve(false);   // ante la duda, asume que NO es fast-start
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function runFfmpeg(args: string[], timeoutMs: number = 5 * 60 * 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath as string, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      if (stderr.length > 10 * 1024) stderr = stderr.slice(-5 * 1024); // cap
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`ffmpeg timeout tras ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(0, 500)}`));
      }
    });
  });
}

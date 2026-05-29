import type { Request, Response } from "express";
import { buildMatchDetailMediator } from "../application/matchDetail/MatchDetailMediator";
import type {
  AssignRefereeBodyDTO,
  RegisterBulkEventsBodyDTO,
  RegisterMatchEventBodyDTO,
  RegisterTrackingBatchBodyDTO,
  RegisterTrackingFrameBodyDTO,
} from "../application/matchDetail/dto/MatchDetailDTOs";
import { MatchFlowServiceAdapter } from "../services/MatchFlowServiceAdapter";
import {
  AssignRefereeRequest,
  AutoAssignRefereesRequest,
  ExportFlowFramesRequest,
  GetFlowMatchAnalyticsRequest,
  GetLeagueRefereesRequest,
  GetRefereeDashboardRequest,
  GetTodayRefereeMatchesRequest,
  GetUpcomingLeagueMatchesRequest,
  MatchDetailGetRequest,
  MatchDetailUpsertRequest,
  RegisterBulkEventsRequest,
  RegisterEventRequest,
  RegisterTrackingBatchRequest,
  RegisterTrackingFrameRequest,
} from "../application/matchDetail/requests/MatchDetailRequests";
import { Match } from "../models/Match";
import { Team } from "../models/Team";
import { League } from "../models/League";
import { LeagueAdmin } from "../models/LeagueAdmin";
import { MatchAnalysisJob } from "../models/MatchAnalysisJob";
import { MatchDetailService } from "../services/MatchDetailService";
import {
  createSignedVideoUploadUrl,
  downloadVideoFromSupabase,
  replaceSupabaseObject,
  uploadVideoToSupabase,
} from "../utils/supabaseStorage";
import { ensureFastStart, isFastStart, isFastStartUrl } from "../utils/videoFastStart";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";
import path from "path";
import os from "os";

const matchDetailMediator = buildMatchDetailMediator(new MatchFlowServiceAdapter());

/**
 * Background job: si el video en Supabase NO es fast-start, lo descarga,
 * re-encodea con moov al inicio y lo sube de vuelta a la misma key.
 * No bloquea la respuesta al cliente.
 *
 * Si falla por cualquier razón, el AI service caerá al fallback de descarga
 * (sigue funcionando, solo no aprovechará el streaming HTTP).
 */
async function ensureFastStartInSupabase(jobId: number, publicUrl: string): Promise<void> {
  const t0 = Date.now();

  // 1. ¿Ya es fast-start? Skip sin tocar nada
  const alreadyOk = await isFastStartUrl(publicUrl);
  if (alreadyOk) {
    console.log(`[fast-start-bg] job ${jobId} — video YA es fast-start, skip (${Date.now() - t0}ms)`);
    return;
  }

  // 2. Descargar a temp local
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `faststart-${jobId}-`));
  const inputPath = path.join(tmpDir, "input");
  try {
    console.log(`[fast-start-bg] job ${jobId} — descargando desde Supabase para re-encoding...`);
    await downloadVideoFromSupabase(publicUrl, inputPath);

    // 3. Re-encodear (intenta remux primero, transcoding si hace falta)
    console.log(`[fast-start-bg] job ${jobId} — aplicando faststart...`);
    const result = await ensureFastStart(inputPath);

    // 4. Reemplazar en Supabase (misma URL, contenido reordenado)
    console.log(`[fast-start-bg] job ${jobId} — reemplazando objeto en Supabase...`);
    await replaceSupabaseObject({
      publicUrl,
      localPath: result.outputPath,
      mimetype: "video/mp4",
    });

    console.log(
      `[fast-start-bg] job ${jobId} — DONE (${result.reEncoded ? "transcoded" : "remux"}, total ${Date.now() - t0}ms)`
    );
  } finally {
    // Limpieza
    try { await fs.promises.rm(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

export class MatchDetailController {
  static getByMatchId = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(new MatchDetailGetRequest(matchId));
    res.json(data);
  };

  static upsertByMatchId = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const result = await matchDetailMediator.send(
      new MatchDetailUpsertRequest(matchId, req.user!.id, req.body)
    );
    res.json(result);
  };

  static upsertCoachLineup = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const result = await MatchDetailService.upsertCoachLineup(matchId, req.user!.id, req.body);
    res.json(result);
  };

  static assignReferee = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const message = await matchDetailMediator.send(
      new AssignRefereeRequest(matchId, req.body as AssignRefereeBodyDTO, req.user!.id)
    );
    res.json({ message });
  };

  static getTodayRefereeMatches = async (req: Request, res: Response): Promise<void> => {
    const data = await matchDetailMediator.send(
      new GetTodayRefereeMatchesRequest(req.user!.id)
    );
    res.json(data);
  };

  static getRefereeDashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await matchDetailMediator.send(
      new GetRefereeDashboardRequest(req.user!.id)
    );
    res.json(data);
  };

  static registerEvent = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new RegisterEventRequest(
        matchId,
        req.user!.id,
        req.body as RegisterMatchEventBodyDTO
      )
    );
    res.status(201).json(data);
  };

  static registerBulkEvents = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new RegisterBulkEventsRequest(
        matchId,
        req.user!.id,
        req.body as RegisterBulkEventsBodyDTO
      )
    );
    res.status(201).json(data);
  };

  static registerTrackingFrame = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new RegisterTrackingFrameRequest(
        matchId,
        req.user!.id,
        req.body as RegisterTrackingFrameBodyDTO
      )
    );
    res.status(201).json(data);
  };

  static registerTrackingBatch = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new RegisterTrackingBatchRequest(
        matchId,
        req.user!.id,
        req.body as RegisterTrackingBatchBodyDTO
      )
    );
    res.status(201).json(data);
  };

  static getLeagueReferees = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await matchDetailMediator.send(
      new GetLeagueRefereesRequest(Number(leagueId), req.user!.id)
    );
    res.json(data);
  };

  static autoAssignReferees = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await matchDetailMediator.send(
      new AutoAssignRefereesRequest(Number(leagueId), req.user!.id)
    );
    res.json(data);
  };

  static getUpcomingLeagueMatches = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const data = await matchDetailMediator.send(
      new GetUpcomingLeagueMatchesRequest(Number(leagueId), req.user!.id, page, pageSize)
    );
    res.json(data);
  };

  static getMatchAnalytics = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const data = await matchDetailMediator.send(
      new GetFlowMatchAnalyticsRequest(Number(matchId))
    );
    res.json(data);
  };

  static exportFrames = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 1000;
    const data = await matchDetailMediator.send(
      new ExportFlowFramesRequest(Number(matchId), page, pageSize)
    );
    res.json(data);
  };

  static uploadVideo = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: "No se recibió ningún archivo de video" });
      return;
    }

    const match = await Match.findByPk(Number(matchId), { attributes: ["id", "leagueId"] });
    if (!match) {
      res.status(404).json({ error: "Partido no encontrado" });
      return;
    }

    // Block re-upload if analysis already completed
    const completedJob = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId), status: "completed" },
    });
    if (completedJob) {
      res.status(409).json({
        error: "Este partido ya fue analizado. No se permite subir otro video.",
        videoSupabaseUrl: completedJob.videoSupabaseUrl,
      });
      return;
    }

    // Re-encoding fast-start ANTES de subir a Supabase.
    // El backend ya tiene el archivo en disco, aprovechamos para garantizar
    // que el AI service pueda hacer streaming HTTP sin descargarlo después.
    let uploadablePath = file.path;
    let uploadableFilename = file.filename;
    let uploadableMimetype = file.mimetype;
    let fastStartTempPath: string | null = null;

    try {
      const alreadyFastStart = await isFastStart(file.path);
      if (alreadyFastStart) {
        console.log(`[upload-video] match ${matchId} — video ya es fast-start, sin re-encoding`);
      } else {
        console.log(`[upload-video] match ${matchId} — re-encoding a fast-start...`);
        const result = await ensureFastStart(file.path);
        uploadablePath = result.outputPath;
        uploadableFilename = uploadableFilename.replace(/\.[^.]+$/, "") + ".mp4";
        uploadableMimetype = "video/mp4";
        fastStartTempPath = result.outputPath;
        console.log(
          `[upload-video] match ${matchId} — fast-start listo (${result.reEncoded ? "transcoded" : "remux"}, ${result.durationMs}ms)`
        );
      }
    } catch (err: any) {
      console.warn(`[upload-video] match ${matchId} — re-encoding falló (${err.message}), subiendo original`);
      // Continúa con el original: el AI service usará fallback de descarga
    }

    // Upload to Supabase synchronously
    let videoSupabaseUrl: string | null = null;
    try {
      const { url } = await uploadVideoToSupabase(uploadablePath, uploadableMimetype, uploadableFilename, Number(matchId));
      videoSupabaseUrl = url;
      console.log(`[upload-video] match ${matchId} — Supabase upload complete: ${url}`);
    } catch (err: any) {
      console.error(`[upload-video] match ${matchId} — Supabase upload failed:`, err.message);
      res.status(500).json({ error: "Error al subir el video al almacenamiento" });
      return;
    } finally {
      // Limpiar el archivo temporal del re-encoding (si se creó)
      if (fastStartTempPath && fastStartTempPath !== file.path) {
        try { fs.unlinkSync(fastStartTempPath); } catch { /* ignore */ }
      }
    }

    // Create analysis job with both local path (for frame extraction) and Supabase URL (for AI service)
    const job = await MatchAnalysisJob.create({
      matchId: Number(matchId),
      leagueId: match.leagueId,
      status: "uploaded",
      videoPath: file.path,                 // el original sin re-encoding (queda en local para AI)
      videoSupabaseUrl,                     // el re-encoded está en Supabase
      videoFilename: file.filename,
      createdBy: req.user!.id,
    });

    console.log(`[upload-video] match ${matchId} — job ${job.id} created (uploaded), supabase: ${videoSupabaseUrl}`);

    res.status(202).json({
      message: "Video subido. Anota los keypoints para iniciar el análisis.",
      matchId: Number(matchId),
      jobId: job.id,
      filename: file.filename,
      videoSupabaseUrl,
    });
  };

  /**
   * Paso 1 de la subida directa: el cliente pide una URL firmada de PUT.
   * No se transfiere el video por el backend — solo metadatos.
   */
  static requestVideoUploadUrl = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const { filename, mimetype, sizeBytes } = req.body as {
      filename?: string;
      mimetype?: string;
      sizeBytes?: number;
    };

    if (!filename || !mimetype) {
      res.status(400).json({ error: "filename y mimetype son requeridos" });
      return;
    }

    const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/x-matroska"];
    if (!allowed.includes(mimetype)) {
      res.status(415).json({ error: "Formato no permitido. Usa MP4, MOV, AVI, WebM o MKV." });
      return;
    }

    const MAX_BYTES = 2 * 1024 * 1024 * 1024;     // 2 GB
    if (sizeBytes && sizeBytes > MAX_BYTES) {
      res.status(413).json({ error: "Video supera el tamaño máximo permitido (2 GB)" });
      return;
    }

    const match = await Match.findByPk(Number(matchId), { attributes: ["id", "leagueId"] });
    if (!match) {
      res.status(404).json({ error: "Partido no encontrado" });
      return;
    }

    // Bloquear si ya hay análisis completado
    const completedJob = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId), status: "completed" },
    });
    if (completedJob) {
      res.status(409).json({
        error: "Este partido ya fue analizado. No se permite subir otro video.",
        videoSupabaseUrl: completedJob.videoSupabaseUrl,
      });
      return;
    }

    try {
      const { uploadUrl, publicUrl, key } = await createSignedVideoUploadUrl({
        matchId: Number(matchId),
        filename,
        mimetype,
        expiresInSeconds: 3600,
      });

      console.log(`[signed-upload] match ${matchId} — URL generada para key ${key}`);

      res.status(200).json({
        uploadUrl,           // PUT directo aquí desde el frontend
        publicUrl,           // URL final donde quedará el video
        key,
        mimetype,            // recordatorio del header que debe mandar el cliente
        expiresIn: 3600,
      });
    } catch (err: any) {
      console.error(`[signed-upload] match ${matchId} failed:`, err.message);
      res.status(500).json({ error: "No se pudo generar la URL de subida" });
    }
  };

  /**
   * Paso 2 de la subida directa: el cliente notifica que terminó de subir.
   * Backend crea el MatchAnalysisJob con la URL pública.
   */
  static completeVideoUpload = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const { publicUrl, filename, firstFrame } = req.body as { publicUrl?: string; filename?: string; firstFrame?: string };

    if (!publicUrl) {
      res.status(400).json({ error: "publicUrl es requerido" });
      return;
    }

    const match = await Match.findByPk(Number(matchId), { attributes: ["id", "leagueId"] });
    if (!match) {
      res.status(404).json({ error: "Partido no encontrado" });
      return;
    }

    // Doble check: que no exista análisis completado mientras subían
    const completedJob = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId), status: "completed" },
    });
    if (completedJob) {
      res.status(409).json({ error: "Este partido ya fue analizado." });
      return;
    }

    const job = await MatchAnalysisJob.create({
      matchId: Number(matchId),
      leagueId: match.leagueId,
      status: "uploaded",
      videoPath: null,                              // subida directa → no hay archivo local
      videoSupabaseUrl: publicUrl,
      videoFilename: filename ?? null,
      createdBy: req.user!.id,
      firstFrame: firstFrame ?? null,               // fotograma extraído en el cliente para anotar después
    });

    console.log(`[complete-upload] match ${matchId} — job ${job.id} created from direct upload`);

    // Respondemos al frontend INMEDIATAMENTE — el re-encoding corre en background.
    // El admin puede marcar esquinas mientras tanto. Cuando llegue al submit,
    // el video ya estará fast-start (re-encoding tarda 10-30s típicamente).
    res.status(201).json({
      message: "Video registrado. Anota los keypoints para iniciar el análisis.",
      matchId: Number(matchId),
      jobId: job.id,
      videoSupabaseUrl: publicUrl,
    });

    // Background task: re-encoding fast-start
    ensureFastStartInSupabase(job.id, publicUrl).catch((err) => {
      console.error(`[fast-start-bg] job ${job.id} falló:`, err.message);
    });
  };

  static getAnalysisStatus = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;

    const job = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId) },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "status", "progress", "currentStep", "framesProcessed", "totalFrames", "error", "videoSupabaseUrl", "pid", "createdAt", "updatedAt"],
    });

    if (!job) {
      res.json({ status: "none" });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      framesProcessed: job.framesProcessed,
      totalFrames: job.totalFrames,
      error: job.error,
      videoSupabaseUrl: job.videoSupabaseUrl,
      pid: job.pid,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    });
  };

  static submitKeypoints = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const rawSrcPts: Array<{ x: number; y: number }> | undefined = req.body.srcPts;
    const playerTags: Array<{ x: number; y: number; label: "home" | "away" | "ball" }> | undefined = req.body.playerTags;
    const identityMap: Record<string, number> | undefined = req.body.identityMap;

    // Determine if valid field corners were provided
    const srcPts = Array.isArray(rawSrcPts) ? rawSrcPts : [];
    const hasValidKeypoints = srcPts.length === 4;

    // Find a pending job
    const job = await MatchAnalysisJob.findOne({
      where: {
        matchId: Number(matchId),
        status: ["uploaded", "annotating", "queued"],
      },
      order: [["createdAt", "DESC"]],
    });

    if (!job) {
      res.status(404).json({ error: "No se encontró un análisis pendiente para este partido. Sube un video primero." });
      return;
    }

    if (!job.videoSupabaseUrl) {
      res.status(400).json({ error: "El job no tiene un video en Supabase. Vuelve a subir el video." });
      return;
    }

    // If no valid corners provided → mark as "annotating" (video is saved, corners pending)
    // If valid corners provided → mark as "queued" and fire AI immediately
    const newStatus = hasValidKeypoints ? "queued" : "annotating";

    await job.update({
      // Only overwrite srcPts when valid corners are provided; keep existing if re-saving metadata only
      ...(hasValidKeypoints ? { srcPts } : {}),
      playerTags: playerTags ?? null,
      identityMap: identityMap ?? null,
      status: newStatus,
      error: null,
    });

    console.log(`[submit-keypoints] match ${matchId} job ${job.id} — ${hasValidKeypoints ? "4 keypoints" : "no keypoints (annotating)"} + ${playerTags?.length ?? 0} player tags, status: ${newStatus}`);

    // PUSH TRIGGER: only fire when we have valid keypoints to process
    if (hasValidKeypoints) {
      const aiUrl = (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
      const userToken = req.headers.authorization;
      if (userToken) {
        fetch(`${aiUrl}/jobs/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": userToken,
          },
          body: JSON.stringify({
            match_id: job.matchId,
            job_id: job.id,
            video_url: job.videoSupabaseUrl,
            src_pts: srcPts,
          }),
        })
          .then((r) => {
            if (r.ok) {
              console.log(`[push-trigger] AI service aceptó job ${job.id} inmediatamente`);
            } else {
              console.warn(`[push-trigger] AI service respondió ${r.status} — fallback a polling`);
            }
          })
          .catch((err) => {
            console.warn(`[push-trigger] AI service inaccesible (${err.message}) — fallback a polling`);
          });
      }
    }

    res.status(202).json({
      message: hasValidKeypoints
        ? "Keypoints y etiquetas recibidos. El análisis será procesado por el servicio de IA."
        : "Video guardado. Abre el panel de análisis para marcar las esquinas del campo cuando estés listo.",
      jobId: job.id,
      status: newStatus,
    });
  };

  static reportProgress = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const { status, progress, currentStep, framesProcessed, totalFrames, error: errorMsg } = req.body;

    const job = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId) },
      order: [["createdAt", "DESC"]],
    });

    if (!job) {
      res.status(404).json({ error: "No hay análisis en proceso para este partido" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (progress !== undefined) updates.progress = progress;
    if (currentStep) updates.currentStep = currentStep;
    if (framesProcessed !== undefined) updates.framesProcessed = framesProcessed;
    if (totalFrames !== undefined) updates.totalFrames = totalFrames;
    if (errorMsg) updates.error = errorMsg;

    await job.update(updates);

    // ── Notificación: análisis listo → participantes del partido ──────────
    if (status === "completed") {
      const { NotificationService } = await import("../services/NotificationService");
      setImmediate(async () => {
        try {
          await NotificationService.notifyMatchParticipants(Number(matchId), {
            type: "analysis_ready",
            title: "Análisis de tu partido disponible",
            message: "Ya puedes ver heatmaps, estadísticas y rating de jugadores",
            payload: { matchId: Number(matchId) },
          });
        } catch (err) {
          console.error("[notif] analysis_ready failed:", err);
        }
      });
    }

    res.json({ jobId: job.id, ...updates });
  };

  static getAnalysisFrame = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;

    const job = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId) },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "videoPath", "videoSupabaseUrl", "firstFrame", "status"],
    });

    if (!job) {
      res.status(404).json({ error: "No se encontró video para este partido" });
      return;
    }

    // 1. Fast path: frame ya cacheado en DB (guardado en upload previo)
    if (job.firstFrame) {
      const raw = job.firstFrame.replace(/^data:image\/[a-z]+;base64,/, "");
      res.json({ frame: raw, width: 0, height: 0 });
      return;
    }

    // 2. Determinar fuente de video: URL de Supabase tiene prioridad; fallback a path local
    const videoSource = job.videoSupabaseUrl ?? job.videoPath;
    if (!videoSource) {
      res.status(404).json({ error: "No se encontró video para este partido" });
      return;
    }

    // 3. Extraer primer fotograma con ffmpeg-static (funciona con URLs y paths locales)
    const { spawn } = await import("child_process");

    if (!ffmpegPath) {
      res.status(500).json({ error: "ffmpeg no disponible en el servidor" });
      return;
    }

    const child = spawn(ffmpegPath, [
      "-i", videoSource,
      "-vframes", "1",
      "-f", "image2pipe",
      "-vcodec", "mjpeg",
      "pipe:1",
    ], { stdio: ["ignore", "pipe", "pipe"] });

    const chunks: Buffer[] = [];
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on("close", async (code: number | null) => {
      if (code !== 0 || chunks.length === 0) {
        console.error(`[getAnalysisFrame] ffmpeg error (code ${code}):`, stderr.slice(-600));
        res.status(500).json({ error: "No se pudo extraer el fotograma del video" });
        return;
      }

      const frameBuffer = Buffer.concat(chunks);
      const base64 = frameBuffer.toString("base64");

      // Cachear en DB para próximas consultas (sin bloquear la respuesta)
      job.update({ firstFrame: base64 }).catch((e: Error) =>
        console.warn("[getAnalysisFrame] no se pudo cachear el frame:", e.message)
      );

      res.json({ frame: base64, width: 0, height: 0 });
    });
  };

  static getPendingAnalysis = async (_req: Request, res: Response): Promise<void> => {
    const jobs = await MatchAnalysisJob.findAll({
      where: { status: "queued" },
      order: [["createdAt", "ASC"]],
      attributes: [
        "id", "matchId", "leagueId",
        "videoPath",          // ← expone path local para que el worker evite descargar
        "videoSupabaseUrl",   // se mantiene como fallback (otra máquina)
        "srcPts", "playerTags", "identityMap", "createdAt",
      ],
      include: [
        { model: League, attributes: ["id", "lineupMode"], required: false },
      ],
    });

    res.json(jobs.map((j: any) => ({
      jobId: j.id,
      matchId: j.matchId,
      leagueId: j.leagueId,
      videoPath: j.videoPath,
      videoSupabaseUrl: j.videoSupabaseUrl,
      srcPts: j.srcPts,
      playerTags: j.playerTags,
      identityMap: j.identityMap,
      // lineupMode del partido (11 o 7). El AI service lo usa para limitar
      // el número de tracks por equipo y evitar saltos visuales por
      // detecciones espurias (banca, árbitros, fotógrafos).
      lineupMode: j.league?.lineupMode ?? 11,
      createdAt: j.createdAt,
    })));
  };

  static analysisPreview = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const { frameBase64, srcPts, detectPitch } = req.body;

    if (!frameBase64 || typeof frameBase64 !== "string") {
      res.status(400).json({ error: "frameBase64 es requerido" });
      return;
    }
    if (!Array.isArray(srcPts) || srcPts.length !== 4) {
      res.status(400).json({ error: "srcPts debe ser un arreglo de 4 puntos" });
      return;
    }

    // Verificar que existe un job para este match
    const job = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId) },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "status"],
    });
    if (!job) {
      res.status(404).json({ error: "Sube un video primero" });
      return;
    }

    const aiUrl = (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");
    const userToken = req.headers.authorization; // reutilizamos el token admin del usuario

    try {
      const response = await fetch(`${aiUrl}/analysis/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userToken ? { Authorization: userToken } : {}),
        },
        body: JSON.stringify({
          frame_base64: frameBase64,
          src_pts: srcPts,
          detect_pitch: !!detectPitch,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[preview] AI service ${response.status}: ${text}`);
        res.status(502).json({ error: "AI service rechazó la petición", detail: text.slice(0, 200) });
        return;
      }

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error("[preview] AI service unreachable:", err.message);
      res.status(503).json({ error: "AI service no disponible" });
    }
  };

  static claimAnalysisJob = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;

    // Buscar el último job (sin importar status). Esto hace el endpoint idempotente:
    //   - Si está "queued" → claim y devolver datos
    //   - Si está "processing" → devolver datos (el worker puede haber sido reiniciado)
    //   - Si está "completed"/"failed" → 410 Gone (no hay nada que procesar)
    //   - Si no existe → 404
    const job = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId) },
      order: [["createdAt", "DESC"]],
    });

    if (!job) {
      res.status(404).json({ error: "No existe ningún análisis para este partido" });
      return;
    }

    if (job.status === "completed") {
      res.status(410).json({ error: "Este análisis ya fue completado", jobId: job.id });
      return;
    }

    if (job.status === "failed") {
      // Permitimos reintentar: lo movemos a processing
      await job.update({ status: "processing", error: null });
      console.log(`[claim-job] match ${matchId} job ${job.id} — re-claimed (previously failed)`);
    } else if (job.status === "processing") {
      // Ya está en processing — el worker probablemente se reinició. Devolvemos los datos.
      console.log(`[claim-job] match ${matchId} job ${job.id} — already processing, returning data idempotently`);
    } else {
      // queued / uploaded / annotating → claim normal
      await job.update({ status: "processing", error: null });
      console.log(`[claim-job] match ${matchId} job ${job.id} — claimed by AI service`);
    }

    // Cargar lineupMode de la liga para que el worker sepa cuántos jugadores
    // máximos puede haber en cada equipo (limita falsos positivos: banca, etc.)
    const league = await League.findByPk(job.leagueId, {
      attributes: ["id", "lineupMode"],
    });

    res.json({
      jobId: job.id,
      matchId: job.matchId,
      leagueId: job.leagueId,
      videoPath: job.videoPath,                  // path local compartido con AI service
      videoSupabaseUrl: job.videoSupabaseUrl,    // fallback si AI corre en otra máquina
      srcPts: job.srcPts,
      playerTags: job.playerTags,
      identityMap: job.identityMap,
      lineupMode: league?.lineupMode ?? 11,      // 11 o 7 — el AI lo usa como cap por equipo
      status: "processing",
    });
  };

  static getUserAnalysisHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const jobs = await MatchAnalysisJob.findAll({
      where: { createdBy: userId },
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "matchId",
        "leagueId",
        "status",
        "progress",
        "currentStep",
        "framesProcessed",
        "totalFrames",
        "error",
        "videoSupabaseUrl",
        "videoFilename",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Match,
          attributes: ["id", "date", "roundName"],
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
            { model: League, attributes: ["id", "name"] },
          ],
        },
      ],
    });

    res.json({
      jobs: jobs.map((j) => ({
        jobId: j.id,
        matchId: j.matchId,
        leagueId: j.leagueId,
        status: j.status,
        progress: j.progress,
        currentStep: j.currentStep,
        framesProcessed: j.framesProcessed,
        totalFrames: j.totalFrames,
        error: j.error,
        videoSupabaseUrl: j.videoSupabaseUrl,
        videoFilename: j.videoFilename,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        match: j.match ? {
          id: j.match.id,
          date: j.match.date,
          roundName: j.match.roundName,
          homeTeam: j.match.homeTeam ? { id: j.match.homeTeam.id, name: j.match.homeTeam.name } : null,
          awayTeam: j.match.awayTeam ? { id: j.match.awayTeam.id, name: j.match.awayTeam.name } : null,
          league: j.match.league ? { id: j.match.league.id, name: j.match.league.name } : null,
        } : null,
      })),
    });
  };

  static getUserAnalysisDetail = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { jobId } = req.params;
    if (!userId) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const job = await MatchAnalysisJob.findOne({
      where: { id: Number(jobId), createdBy: userId },
      attributes: [
        "id",
        "matchId",
        "leagueId",
        "status",
        "progress",
        "currentStep",
        "framesProcessed",
        "totalFrames",
        "error",
        "videoSupabaseUrl",
        "videoFilename",
        "srcPts",
        "playerTags",
        "identityMap",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Match,
          attributes: ["id", "date", "roundName"],
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
            { model: League, attributes: ["id", "name"] },
          ],
        },
      ],
    });

    if (!job) {
      res.status(404).json({ error: "No se encontró el análisis" });
      return;
    }

    res.json({
      job: {
        jobId: job.id,
        matchId: job.matchId,
        leagueId: job.leagueId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        framesProcessed: job.framesProcessed,
        totalFrames: job.totalFrames,
        error: job.error,
        videoSupabaseUrl: job.videoSupabaseUrl,
        videoFilename: job.videoFilename,
        srcPts: job.srcPts,
        playerTags: job.playerTags,
        identityMap: job.identityMap,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        match: job.match ? {
          id: job.match.id,
          date: job.match.date,
          roundName: job.match.roundName,
          homeTeam: job.match.homeTeam ? { id: job.match.homeTeam.id, name: job.match.homeTeam.name } : null,
          awayTeam: job.match.awayTeam ? { id: job.match.awayTeam.id, name: job.match.awayTeam.name } : null,
          league: job.match.league ? { id: job.match.league.id, name: job.match.league.name } : null,
        } : null,
      },
    });
  };

  static getAdminAnalysisHistory = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const adminLeagues = await LeagueAdmin.findAll({
      where: { userId },
      attributes: ["leagueId"],
    });
    const leagueIds = adminLeagues.map((l) => l.leagueId);

    if (!leagueIds.length) {
      res.json({ jobs: [] });
      return;
    }

    const jobs = await MatchAnalysisJob.findAll({
      where: { leagueId: leagueIds },
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "matchId",
        "leagueId",
        "status",
        "progress",
        "currentStep",
        "framesProcessed",
        "totalFrames",
        "error",
        "videoSupabaseUrl",
        "videoFilename",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Match,
          attributes: ["id", "date", "roundName"],
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
            { model: League, attributes: ["id", "name"] },
          ],
        },
      ],
    });

    res.json({
      jobs: jobs.map((j) => ({
        jobId: j.id,
        matchId: j.matchId,
        leagueId: j.leagueId,
        status: j.status,
        progress: j.progress,
        currentStep: j.currentStep,
        framesProcessed: j.framesProcessed,
        totalFrames: j.totalFrames,
        error: j.error,
        videoSupabaseUrl: j.videoSupabaseUrl,
        videoFilename: j.videoFilename,
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
        match: j.match ? {
          id: j.match.id,
          date: j.match.date,
          roundName: j.match.roundName,
          homeTeam: j.match.homeTeam ? { id: j.match.homeTeam.id, name: j.match.homeTeam.name } : null,
          awayTeam: j.match.awayTeam ? { id: j.match.awayTeam.id, name: j.match.awayTeam.name } : null,
          league: j.match.league ? { id: j.match.league.id, name: j.match.league.name } : null,
        } : null,
      })),
    });
  };

  static getAdminAnalysisDetail = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.id;
    const { jobId } = req.params;
    if (!userId) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }

    const adminLeagues = await LeagueAdmin.findAll({
      where: { userId },
      attributes: ["leagueId"],
    });
    const leagueIds = adminLeagues.map((l) => l.leagueId);

    if (!leagueIds.length) {
      res.status(404).json({ error: "No se encontró el análisis" });
      return;
    }

    const job = await MatchAnalysisJob.findOne({
      where: { id: Number(jobId), leagueId: leagueIds },
      attributes: [
        "id",
        "matchId",
        "leagueId",
        "status",
        "progress",
        "currentStep",
        "framesProcessed",
        "totalFrames",
        "error",
        "videoSupabaseUrl",
        "videoFilename",
        "srcPts",
        "playerTags",
        "identityMap",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: Match,
          attributes: ["id", "date", "roundName"],
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
            { model: League, attributes: ["id", "name"] },
          ],
        },
      ],
    });

    if (!job) {
      res.status(404).json({ error: "No se encontró el análisis" });
      return;
    }

    res.json({
      job: {
        jobId: job.id,
        matchId: job.matchId,
        leagueId: job.leagueId,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        framesProcessed: job.framesProcessed,
        totalFrames: job.totalFrames,
        error: job.error,
        videoSupabaseUrl: job.videoSupabaseUrl,
        videoFilename: job.videoFilename,
        srcPts: job.srcPts,
        playerTags: job.playerTags,
        identityMap: job.identityMap,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        match: job.match ? {
          id: job.match.id,
          date: job.match.date,
          roundName: job.match.roundName,
          homeTeam: job.match.homeTeam ? { id: job.match.homeTeam.id, name: job.match.homeTeam.name } : null,
          awayTeam: job.match.awayTeam ? { id: job.match.awayTeam.id, name: job.match.awayTeam.name } : null,
          league: job.match.league ? { id: job.match.league.id, name: job.match.league.name } : null,
        } : null,
      },
    });
  };
}

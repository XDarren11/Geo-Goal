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
import { MatchAnalysisJob } from "../models/MatchAnalysisJob";
import { MatchDetailService } from "../services/MatchDetailService";
import { uploadVideoToSupabase } from "../utils/supabaseStorage";

const matchDetailMediator = buildMatchDetailMediator(new MatchFlowServiceAdapter());

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

    // Upload to Supabase synchronously
    let videoSupabaseUrl: string | null = null;
    try {
      const { url } = await uploadVideoToSupabase(file.path, file.mimetype, file.filename, Number(matchId));
      videoSupabaseUrl = url;
      console.log(`[upload-video] match ${matchId} — Supabase upload complete: ${url}`);
    } catch (err: any) {
      console.error(`[upload-video] match ${matchId} — Supabase upload failed:`, err.message);
      res.status(500).json({ error: "Error al subir el video al almacenamiento" });
      return;
    }

    // Create analysis job with both local path (for frame extraction) and Supabase URL (for AI service)
    const job = await MatchAnalysisJob.create({
      matchId: Number(matchId),
      leagueId: match.leagueId,
      status: "uploaded",
      videoPath: file.path,
      videoSupabaseUrl,
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
    const srcPts: Array<{ x: number; y: number }> = req.body.srcPts;
    const playerTags: Array<{ x: number; y: number; label: "home" | "away" | "ball" }> | undefined = req.body.playerTags;

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

    // Save keypoints, player tags and set status to queued
    await job.update({
      srcPts,
      playerTags: playerTags ?? null,
      status: "queued",
      error: null,
    });

    console.log(`[submit-keypoints] match ${matchId} job ${job.id} — keypoints + ${playerTags?.length ?? 0} player tags saved, status: queued`);

    res.status(202).json({
      message: "Keypoints y etiquetas recibidos. El análisis será procesado por el servicio de IA.",
      jobId: job.id,
      status: "queued",
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

    res.json({ jobId: job.id, ...updates });
  };

  static getAnalysisFrame = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;

    const job = await MatchAnalysisJob.findOne({
      where: { matchId: Number(matchId) },
      order: [["createdAt", "DESC"]],
      attributes: ["id", "videoPath", "status"],
    });

    if (!job || !job.videoPath) {
      res.status(404).json({ error: "No se encontró video para este partido" });
      return;
    }

    const { spawn } = await import("child_process");
    const path = await import("path");
    const aiDir = path.resolve(__dirname, "..", "..", "..", "Geo-Goal_ai_service");
    const pythonCmd = process.platform === "win32" ? "python" : "python3";

    const child = spawn(pythonCmd, [
      "src/main.py",
      "extract-frame",
      job.videoPath,
      "--frame", "0",
    ], {
      cwd: aiDir,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on("close", (code: number | null) => {
      if (code !== 0 || !stdout.trim()) {
        console.error(`[getAnalysisFrame] Python error (code ${code}):`, stderr);
        res.status(500).json({ error: "No se pudo extraer el fotograma del video" });
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) {
          res.status(500).json({ error: result.error });
          return;
        }
        res.json(result);
      } catch {
        res.status(500).json({ error: "Respuesta inesperada del extractor de frames" });
      }
    });
  };

  static getPendingAnalysis = async (_req: Request, res: Response): Promise<void> => {
    const jobs = await MatchAnalysisJob.findAll({
      where: { status: "queued" },
      order: [["createdAt", "ASC"]],
      attributes: ["id", "matchId", "leagueId", "videoSupabaseUrl", "srcPts", "playerTags", "createdAt"],
    });

    res.json(jobs.map((j) => ({
      jobId: j.id,
      matchId: j.matchId,
      leagueId: j.leagueId,
      videoSupabaseUrl: j.videoSupabaseUrl,
      srcPts: j.srcPts,
      playerTags: j.playerTags,
      createdAt: j.createdAt,
    })));
  };

  static claimAnalysisJob = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;

    const job = await MatchAnalysisJob.findOne({
      where: {
        matchId: Number(matchId),
        status: "queued",
      },
      order: [["createdAt", "DESC"]],
    });

    if (!job) {
      res.status(409).json({ error: "No hay un job queued para este partido, o ya fue reclamado" });
      return;
    }

    await job.update({ status: "processing", error: null });

    console.log(`[claim-job] match ${matchId} job ${job.id} — claimed by AI service`);

    res.json({
      jobId: job.id,
      matchId: job.matchId,
      leagueId: job.leagueId,
      videoSupabaseUrl: job.videoSupabaseUrl,
      srcPts: job.srcPts,
      playerTags: job.playerTags,
      status: "processing",
    });
  };
}

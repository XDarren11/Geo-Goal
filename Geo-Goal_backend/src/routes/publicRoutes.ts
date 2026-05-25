import { Router } from "express";
import { param, body } from "express-validator";
import { asyncHandler } from "../middleware/asyncHandler";
import { authenticate } from "../middleware/auth";
import { handleInputError } from "../middleware/validation";
import { uploadVideo } from "../middleware/upload";
import { PublicController } from "../controllers/PublicController";
import { MatchDetailController } from "../controllers/MatchDetailController";
import { LeagueController } from "../controllers/LeagueController";

const router = Router();

router.get("/news", asyncHandler(PublicController.getNews));

router.get("/leagues", asyncHandler(PublicController.getLeagues));

router.get(
  "/leagues/:leagueId",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(PublicController.getLeagueDetail)
);

router.get(
  "/leagues/:leagueId/standings",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(PublicController.getStandings)
);

router.get(
  "/leagues/:leagueId/fixture",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(PublicController.getFixture)
);

router.get(
  "/leagues/:leagueId/fixture/locations",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(PublicController.getFixtureWithLocations)
);

router.get(
  "/leagues/:leagueId/teams/:teamId/profile",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  param("teamId").isInt().withMessage("ID de equipo no válido"),
  handleInputError,
  asyncHandler(PublicController.getTeamProfile)
);

router.get(
  "/matches/:matchId/detail",
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(MatchDetailController.getByMatchId)
);

router.get(
  "/matches/:matchId/analytics",
  param("matchId").isInt().withMessage("ID de partido no vlido"),
  handleInputError,
  asyncHandler(PublicController.getMatchAnalytics)
);

router.get(
  "/matches/:matchId/analytics/advanced",
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(PublicController.getAdvancedAnalytics)
);

router.get(
  "/matches/:matchId/prediction",
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(PublicController.getMatchPrediction)
);

router.get(
  "/players/:userId/form",
  param("userId").isInt().withMessage("ID de usuario no válido"),
  handleInputError,
  asyncHandler(PublicController.getPlayerForm)
);

router.get(
  "/leagues/:leagueId/weekly-award",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(PublicController.getWeeklyAward)
);

// ── Fase 5: xG y xT ──────────────────────────────────────────────────────────

router.get(
  "/matches/:matchId/xg",
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(PublicController.getMatchXG)
);

router.get(
  "/matches/:matchId/xt",
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(PublicController.getMatchXT)
);

// ── Fase 6: Comparativas ──────────────────────────────────────────────────────

router.get(
  "/teams/:teamA/h2h/:teamB",
  param("teamA").isInt().withMessage("ID de equipo no válido"),
  param("teamB").isInt().withMessage("ID de equipo no válido"),
  handleInputError,
  asyncHandler(PublicController.getH2H)
);

router.get(
  "/teams/:teamId/form",
  param("teamId").isInt().withMessage("ID de equipo no válido"),
  handleInputError,
  asyncHandler(PublicController.getTeamForm)
);

router.get(
  "/players/:id1/compare/:id2",
  param("id1").isInt().withMessage("ID de jugador no válido"),
  param("id2").isInt().withMessage("ID de jugador no válido"),
  handleInputError,
  asyncHandler(PublicController.comparePlayers)
);

router.get(
  "/players/:id/similar",
  param("id").isInt().withMessage("ID de jugador no válido"),
  handleInputError,
  asyncHandler(PublicController.getSimilarPlayers)
);

router.get(
  "/matches/:matchId/frames/export",
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(PublicController.exportFrames)
);

router.post(
  "/matches/:matchId/tracking/batch",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  body("frames").isArray({ min: 1 }).withMessage("frames debe ser un arreglo no vacío"),
  handleInputError,
  asyncHandler(MatchDetailController.registerTrackingBatch)
);

router.post(
  "/matches/:matchId/upload-video",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  uploadVideo.single("video"),
  handleInputError,
  asyncHandler(MatchDetailController.uploadVideo)
);

// Subida directa: paso 1 — pedir URL firmada para subir DIRECTO a Supabase
router.post(
  "/matches/:matchId/upload-video/signed-url",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  body("filename").isString().withMessage("filename es requerido"),
  body("mimetype").isString().withMessage("mimetype es requerido"),
  body("sizeBytes").optional().isInt({ min: 1 }),
  handleInputError,
  asyncHandler(MatchDetailController.requestVideoUploadUrl)
);

// Subida directa: paso 2 — notificar que el upload a Supabase terminó
router.post(
  "/matches/:matchId/upload-video/complete",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  body("publicUrl").isURL().withMessage("publicUrl debe ser una URL válida"),
  body("filename").optional().isString(),
  handleInputError,
  asyncHandler(MatchDetailController.completeVideoUpload)
);

router.get(
  "/matches/:matchId/analysis/status",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(MatchDetailController.getAnalysisStatus)
);

router.put(
  "/matches/:matchId/analysis/keypoints",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  body("srcPts")
    .isArray({ min: 4, max: 4 })
    .withMessage("srcPts debe ser un arreglo de exactamente 4 puntos"),
  body("srcPts.*.x").isNumeric().withMessage("Cada punto debe tener x numérico"),
  body("srcPts.*.y").isNumeric().withMessage("Cada punto debe tener y numérico"),
  body("playerTags")
    .optional()
    .isArray()
    .withMessage("playerTags debe ser un arreglo"),
  body("playerTags.*.x").optional().isNumeric(),
  body("playerTags.*.y").optional().isNumeric(),
  body("playerTags.*.label").optional().isIn(["home", "away", "ball"]),
  body("identityMap").optional().isObject().withMessage("identityMap debe ser un objeto"),
  handleInputError,
  asyncHandler(MatchDetailController.submitKeypoints)
);

router.put(
  "/matches/:matchId/analysis/progress",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  body("status").isString().withMessage("status es requerido"),
  body("progress").optional().isInt({ min: 0, max: 100 }),
  body("currentStep").optional().isString(),
  body("framesProcessed").optional().isInt(),
  body("totalFrames").optional().isInt(),
  body("error").optional().isString(),
  handleInputError,
  asyncHandler(MatchDetailController.reportProgress)
);

router.get(
  "/matches/:matchId/analysis/frame",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(MatchDetailController.getAnalysisFrame)
);

router.post(
  "/matches/:matchId/analysis/preview",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  body("frameBase64").isString().withMessage("frameBase64 es requerido"),
  body("srcPts").isArray({ min: 4, max: 4 }).withMessage("srcPts debe tener exactamente 4 puntos"),
  body("srcPts.*.x").isNumeric().withMessage("Cada punto debe tener x numérico"),
  body("srcPts.*.y").isNumeric().withMessage("Cada punto debe tener y numérico"),
  handleInputError,
  asyncHandler(MatchDetailController.analysisPreview)
);

router.get(
  "/matches/pending-analysis",
  authenticate,
  handleInputError,
  asyncHandler(MatchDetailController.getPendingAnalysis)
);

router.put(
  "/matches/:matchId/analysis/claim",
  authenticate,
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(MatchDetailController.claimAnalysisJob)
);

router.get("/:leagueId/top-scorers", LeagueController.getTopScorers);

export default router;

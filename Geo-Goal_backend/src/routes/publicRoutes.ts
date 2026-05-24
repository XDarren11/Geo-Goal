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
  param("matchId").isInt().withMessage("ID de partido no válido"),
  handleInputError,
  asyncHandler(PublicController.getMatchAnalytics)
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

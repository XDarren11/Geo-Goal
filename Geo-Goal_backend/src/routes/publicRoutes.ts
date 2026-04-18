import { Router } from "express";
import { param } from "express-validator";
import { asyncHandler } from "../middleware/asyncHandler";
import { handleInputError } from "../middleware/validation";
import { PublicController } from "../controllers/PublicController";
import { MatchDetailController } from "../controllers/MatchDetailController";

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

export default router;

import { AppError } from "../types/errors";
import { Match } from "../models/Match";
import { MatchDetail } from "../models/MatchDetail";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { Field } from "../models/Field";
import { NotificationService } from "./NotificationService";

type LineupEntry = Record<string, unknown>;

type UpsertMatchDetailInput = {
  kickoffTime?: Date | null;
  durationMinutes?: number;
  endTime?: Date | null;
  matchDay?: string | null;
  fieldId?: number | null;
  homeCoachId?: number | null;
  awayCoachId?: number | null;
  homeStartingXI?: LineupEntry[];
  awayStartingXI?: LineupEntry[];
  homeBench?: LineupEntry[];
  awayBench?: LineupEntry[];
  referee?: string | null;
  weather?: string | null;
  attendance?: number | null;
  notes?: string | null;
};

export class MatchDetailService {
  private static validateLineups(input: UpsertMatchDetailInput): void {
    const checkArray = (value: unknown, label: string, max: number) => {
      if (value === undefined) return;
      if (!Array.isArray(value)) {
        throw new AppError(400, `${label} debe ser un arreglo`);
      }
      if (value.length > max) {
        throw new AppError(400, `${label} supera el máximo permitido (${max})`);
      }
    };

    checkArray(input.homeStartingXI, "Titulares local", 11);
    checkArray(input.awayStartingXI, "Titulares visitante", 11);
    checkArray(input.homeBench, "Banca local", 20);
    checkArray(input.awayBench, "Banca visitante", 20);

    if (
      input.durationMinutes !== undefined &&
      (Number.isNaN(Number(input.durationMinutes)) || Number(input.durationMinutes) <= 0)
    ) {
      throw new AppError(400, "La duración debe ser un número positivo");
    }

    if (
      input.attendance !== undefined &&
      input.attendance !== null &&
      (Number.isNaN(Number(input.attendance)) || Number(input.attendance) < 0)
    ) {
      throw new AppError(400, "La asistencia no puede ser negativa");
    }
  }

  private static async ensureForeignKeys(input: UpsertMatchDetailInput): Promise<void> {
    if (input.fieldId !== undefined && input.fieldId !== null) {
      const field = await Field.findByPk(input.fieldId);
      if (!field) throw new AppError(404, "Campo no encontrado");
    }

    if (input.homeCoachId !== undefined && input.homeCoachId !== null) {
      const coach = await User.findByPk(input.homeCoachId);
      if (!coach) throw new AppError(404, "Entrenador local no encontrado");
    }

    if (input.awayCoachId !== undefined && input.awayCoachId !== null) {
      const coach = await User.findByPk(input.awayCoachId);
      if (!coach) throw new AppError(404, "Entrenador visitante no encontrado");
    }
  }

  static async getByMatchId(matchId: string) {
    const match = await Match.findByPk(matchId, {
      include: [
        {
          model: Team,
          as: "homeTeam",
          attributes: ["id", "name", "logoUrl", "trainerId"],
          include: [
            {
              model: User,
              as: "trainer",
              attributes: ["id", "name", "email"],
            },
          ],
        },
        {
          model: Team,
          as: "awayTeam",
          attributes: ["id", "name", "logoUrl", "trainerId"],
          include: [
            {
              model: User,
              as: "trainer",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
    });

    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    const detail = await MatchDetail.findOne({
      where: { matchId: Number(matchId) },
      include: [
        { model: Field, attributes: ["id", "name", "address", "city", "state", "country"] },
        { model: User, as: "homeCoach", attributes: ["id", "name", "email"] },
        { model: User, as: "awayCoach", attributes: ["id", "name", "email"] },
      ],
    });

    const kickoff = detail?.kickoffTime ?? match.date ?? null;
    const durationMinutes = detail?.durationMinutes ?? 90;
    const computedEnd =
      detail?.endTime ??
      (kickoff
        ? new Date(new Date(kickoff).getTime() + durationMinutes * 60 * 1000)
        : null);

    return {
      match,
      detail: {
        ...detail?.toJSON(),
        kickoffTime: kickoff,
        durationMinutes,
        endTime: computedEnd,
        matchDay: detail?.matchDay ?? (match.date ? new Date(match.date).toISOString().slice(0, 10) : null),
        homeCoach: detail?.homeCoach ?? (match.homeTeam as Team)?.trainer ?? null,
        awayCoach: detail?.awayCoach ?? (match.awayTeam as Team)?.trainer ?? null,
      },
    };
  }

  static async upsertByMatchId(
    matchId: string,
    actorUserId: number,
    input: UpsertMatchDetailInput
  ) {
    const match = await Match.findByPk(matchId);
    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    if (
      input.kickoffTime !== undefined &&
      match.date &&
      new Date(match.date).getTime() < Date.now()
    ) {
      throw new AppError(
        409,
        "No se puede cambiar la fecha de un partido cuya fecha/hora ya pasó"
      );
    }

    this.validateLineups(input);
    await this.ensureForeignKeys(input);

    const parsedKickoff =
      input.kickoffTime === undefined
        ? undefined
        : input.kickoffTime === null
          ? null
          : new Date(input.kickoffTime);

    const parsedEndTime =
      input.endTime === undefined
        ? undefined
        : input.endTime === null
          ? null
          : new Date(input.endTime);

    const [detail, created] = await MatchDetail.findOrCreate({
      where: { matchId: Number(matchId) },
      defaults: {
        matchId: Number(matchId),
        kickoffTime: parsedKickoff ?? match.date ?? null,
        durationMinutes: input.durationMinutes ?? 90,
        endTime: parsedEndTime ?? null,
        matchDay: input.matchDay ?? (match.date ? new Date(match.date).toISOString().slice(0, 10) : null),
        fieldId: input.fieldId ?? null,
        homeCoachId: input.homeCoachId ?? null,
        awayCoachId: input.awayCoachId ?? null,
        homeStartingXI: input.homeStartingXI ?? [],
        awayStartingXI: input.awayStartingXI ?? [],
        homeBench: input.homeBench ?? [],
        awayBench: input.awayBench ?? [],
        referee: input.referee ?? null,
        weather: input.weather ?? null,
        attendance: input.attendance ?? null,
        notes: input.notes ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    if (!created) {
      if (parsedKickoff !== undefined) detail.kickoffTime = parsedKickoff;
      if (input.durationMinutes !== undefined) detail.durationMinutes = input.durationMinutes;
      if (parsedEndTime !== undefined) detail.endTime = parsedEndTime;
      if (input.matchDay !== undefined) detail.matchDay = input.matchDay;
      if (input.fieldId !== undefined) detail.fieldId = input.fieldId;
      if (input.homeCoachId !== undefined) detail.homeCoachId = input.homeCoachId;
      if (input.awayCoachId !== undefined) detail.awayCoachId = input.awayCoachId;
      if (input.homeStartingXI !== undefined) detail.homeStartingXI = input.homeStartingXI;
      if (input.awayStartingXI !== undefined) detail.awayStartingXI = input.awayStartingXI;
      if (input.homeBench !== undefined) detail.homeBench = input.homeBench;
      if (input.awayBench !== undefined) detail.awayBench = input.awayBench;
      if (input.referee !== undefined) detail.referee = input.referee;
      if (input.weather !== undefined) detail.weather = input.weather;
      if (input.attendance !== undefined) detail.attendance = input.attendance;
      if (input.notes !== undefined) detail.notes = input.notes;
      detail.updatedBy = actorUserId;
      await detail.save();
    }

    if (parsedKickoff !== undefined) {
      match.date = parsedKickoff;
      await match.save();

      if (parsedKickoff) {
        await NotificationService.notifyMatchScheduled(match.id, parsedKickoff);
      }
    }

    const reloaded = await this.getByMatchId(matchId);
    return {
      message: created
        ? "Detalle de partido creado correctamente"
        : "Detalle de partido actualizado correctamente",
      data: reloaded,
    };
  }
}

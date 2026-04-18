import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { League } from "./League";
import { Team } from "./Team";

@Table({ tableName: "fields" })
export class Field extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare address: string;

  @Column({ type: DataType.FLOAT, allowNull: false })
  declare lat: number;

  @Column({ type: DataType.FLOAT, allowNull: false })
  declare lng: number;

  @Column({ type: DataType.STRING, allowNull: true })
  declare city: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare state: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare country: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare capacity: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isActive: boolean;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string | null;

  @ForeignKey(() => League)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare leagueId: number | null;

  @BelongsTo(() => League)
  declare league: League;

  @ForeignKey(() => Team)
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare teamId: number | null;

  @BelongsTo(() => Team)
  declare team: Team;
}

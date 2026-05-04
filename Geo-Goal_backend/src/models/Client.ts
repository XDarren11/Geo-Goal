import { Table, Column, Model, DataType, Default } from 'sequelize-typescript';

@Table({ tableName: 'clients' })
export class Client extends Model {
    @Column({ type: DataType.UUID, allowNull: false, unique: true })
    declare clientId: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare clientSecret: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare name: string;

    @Default(true)
    @Column({ type: DataType.BOOLEAN })
    declare active: boolean;

    @Default([])
    @Column({ type: DataType.JSONB })
    declare permissions: string[];
}

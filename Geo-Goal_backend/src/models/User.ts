import { Table, Column, Model, DataType, Default } from 'sequelize-typescript';

@Table({
    tableName: 'users' // Nombre de la tabla en la BD
})
class User extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare name: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare password: string;

    @Default(false) // Valor por defecto
    @Column({
        type: DataType.BOOLEAN
    })
    declare confirmed: boolean;
}

export default User;
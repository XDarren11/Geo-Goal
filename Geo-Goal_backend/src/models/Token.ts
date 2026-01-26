import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User'; // Asegúrate de importar tu modelo de Usuario

@Table({
    tableName: 'tokens'
})
class Token extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare token: string;

    // --- RELACIÓN CON USUARIO ---
    
    // 1. Definimos la columna que guardará el ID (La llave foránea)
    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare userId: number;

    // 2. Definimos la relación para poder hacer 'include' (join) luego
    @BelongsTo(() => User)
    declare user: User;
}

export default Token;
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    const normalizeTableName = (table) => {
      if (typeof table === 'string') {
        return table.includes('.') ? table.split('.').pop().replace(/"/g, '') : table.replace(/"/g, '');
      }

      if (table && typeof table === 'object') {
        return table.tableName || table.name || '';
      }

      return '';
    };

    const tableExists = async (tableName) => {
      const tables = await queryInterface.showAllTables();
      return tables.map(normalizeTableName).includes(tableName);
    };

    const columnExists = async (tableName, columnName) => {
      if (!(await tableExists(tableName))) return false;
      const definition = await queryInterface.describeTable(tableName);
      return Boolean(definition[columnName]);
    };

    const getFkConstraints = async (tableName) => {
      try {
        const refs = await queryInterface.getForeignKeyReferencesForTable(tableName);
        return refs.map((ref) => ref.constraintName).filter(Boolean);
      } catch (_error) {
        return [];
      }
    };

    const ensureColumn = async (tableName, columnName, definition) => {
      if (!(await columnExists(tableName, columnName))) {
        await queryInterface.addColumn(tableName, columnName, definition);
      }
    };

    const ensureFk = async (tableName, columns, options) => {
      const existing = await getFkConstraints(tableName);
      if (!existing.includes(options.name)) {
        await queryInterface.addConstraint(tableName, {
          fields: columns,
          type: 'foreign key',
          ...options,
        });
      }
    };

    // 1) seasons
    if (!(await tableExists('seasons'))) {
      await queryInterface.createTable('seasons', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        leagueId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'leagues', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        year: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        startDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        endDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'draft',
        },
        isCurrent: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        updatedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('seasons', ['leagueId']);
      await queryInterface.addIndex('seasons', ['leagueId', 'year']);
      await queryInterface.addIndex('seasons', ['leagueId', 'isCurrent']);
    } else {
      await ensureColumn('seasons', 'leagueId', {
        type: DataTypes.INTEGER,
        allowNull: false,
      });
      await ensureColumn('seasons', 'name', {
        type: DataTypes.STRING,
        allowNull: false,
      });
      await ensureColumn('seasons', 'year', {
        type: DataTypes.INTEGER,
        allowNull: false,
      });
      await ensureColumn('seasons', 'startDate', {
        type: DataTypes.DATEONLY,
        allowNull: false,
      });
      await ensureColumn('seasons', 'endDate', {
        type: DataTypes.DATEONLY,
        allowNull: false,
      });
      await ensureColumn('seasons', 'isCurrent', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await ensureColumn('seasons', 'createdBy', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await ensureColumn('seasons', 'updatedBy', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });

      if (await columnExists('seasons', 'status')) {
        await queryInterface.sequelize.query('ALTER TABLE "seasons" ALTER COLUMN "status" DROP DEFAULT;');
        await queryInterface.sequelize.query('ALTER TABLE "seasons" ALTER COLUMN "status" TYPE VARCHAR(32) USING "status"::text;');
        await queryInterface.sequelize.query("ALTER TABLE \"seasons\" ALTER COLUMN \"status\" SET DEFAULT 'draft';");
        await queryInterface.sequelize.query("UPDATE \"seasons\" SET \"status\" = 'draft' WHERE \"status\" IS NULL OR \"status\" = '';");
        await queryInterface.changeColumn('seasons', 'status', {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'draft',
        });
      } else {
        await ensureColumn('seasons', 'status', {
          type: DataTypes.STRING,
          allowNull: false,
          defaultValue: 'draft',
        });
      }

      await ensureFk('seasons', ['leagueId'], {
        name: 'fk_seasons_league_id',
        references: {
          table: 'leagues',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });

      await ensureFk('seasons', ['createdBy'], {
        name: 'fk_seasons_created_by',
        references: {
          table: 'users',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await ensureFk('seasons', ['updatedBy'], {
        name: 'fk_seasons_updated_by',
        references: {
          table: 'users',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // 2) audit_logs
    if (!(await tableExists('audit_logs'))) {
      await queryInterface.createTable('audit_logs', {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        actorUserId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        leagueId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'leagues', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        seasonId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'seasons', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        entityType: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        entityId: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        action: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        beforeData: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        afterData: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        ip: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      });

      await queryInterface.addIndex('audit_logs', ['createdAt']);
      await queryInterface.addIndex('audit_logs', ['leagueId']);
      await queryInterface.addIndex('audit_logs', ['seasonId']);
      await queryInterface.addIndex('audit_logs', ['entityType', 'entityId']);
    } else {
      await ensureColumn('audit_logs', 'actorUserId', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await ensureColumn('audit_logs', 'leagueId', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await ensureColumn('audit_logs', 'seasonId', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      await ensureColumn('audit_logs', 'entityType', {
        type: DataTypes.STRING,
        allowNull: false,
      });
      await ensureColumn('audit_logs', 'entityId', {
        type: DataTypes.STRING,
        allowNull: false,
      });
      await ensureColumn('audit_logs', 'beforeData', {
        type: DataTypes.JSONB,
        allowNull: true,
      });
      await ensureColumn('audit_logs', 'afterData', {
        type: DataTypes.JSONB,
        allowNull: true,
      });
      await ensureColumn('audit_logs', 'reason', {
        type: DataTypes.TEXT,
        allowNull: true,
      });
      await ensureColumn('audit_logs', 'ip', {
        type: DataTypes.STRING,
        allowNull: true,
      });
      await ensureColumn('audit_logs', 'userAgent', {
        type: DataTypes.TEXT,
        allowNull: true,
      });

      if (await columnExists('audit_logs', 'action')) {
        await queryInterface.sequelize.query('ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE VARCHAR(64) USING "action"::text;');
        await queryInterface.changeColumn('audit_logs', 'action', {
          type: DataTypes.STRING,
          allowNull: false,
        });
      } else {
        await ensureColumn('audit_logs', 'action', {
          type: DataTypes.STRING,
          allowNull: false,
        });
      }

      await ensureFk('audit_logs', ['actorUserId'], {
        name: 'fk_audit_logs_actor_user_id',
        references: {
          table: 'users',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await ensureFk('audit_logs', ['leagueId'], {
        name: 'fk_audit_logs_league_id',
        references: {
          table: 'leagues',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await ensureFk('audit_logs', ['seasonId'], {
        name: 'fk_audit_logs_season_id',
        references: {
          table: 'seasons',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // 3) matches.seasonId
    if (await tableExists('matches')) {
      await ensureColumn('matches', 'seasonId', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });

      await ensureFk('matches', ['seasonId'], {
        name: 'fk_matches_season_id',
        references: {
          table: 'seasons',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // 4) team_league_stats.seasonId
    if (await tableExists('team_league_stats')) {
      await ensureColumn('team_league_stats', 'seasonId', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });

      await ensureFk('team_league_stats', ['seasonId'], {
        name: 'fk_team_league_stats_season_id',
        references: {
          table: 'seasons',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  async down(queryInterface) {
    // No destructivo por seguridad de datos en entornos compartidos.
    // Si necesitas rollback destructivo, se puede crear una migración explícita de reversión.
    await Promise.resolve(queryInterface);
  },
};

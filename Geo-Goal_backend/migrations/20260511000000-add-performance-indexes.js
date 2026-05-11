'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const hasIndex = async (table, name) => {
      const indexes = await queryInterface.showIndex(table);
      return indexes.some((idx) => idx.name === name);
    };

    // --- matches indexes ---

    if (!(await hasIndex('matches', 'idx_matches_league_played'))) {
      await queryInterface.addIndex('matches', ['leagueId', 'played'], {
        name: 'idx_matches_league_played',
      });
    }

    if (!(await hasIndex('matches', 'idx_matches_home_played_date'))) {
      await queryInterface.addIndex('matches', ['homeTeamId', 'played', 'date'], {
        name: 'idx_matches_home_played_date',
      });
    }

    if (!(await hasIndex('matches', 'idx_matches_away_played_date'))) {
      await queryInterface.addIndex('matches', ['awayTeamId', 'played', 'date'], {
        name: 'idx_matches_away_played_date',
      });
    }

    if (!(await hasIndex('matches', 'idx_matches_league_season'))) {
      await queryInterface.addIndex('matches', ['leagueId', 'seasonId'], {
        name: 'idx_matches_league_season',
      });
    }

    // --- match_events indexes ---

    if (!(await hasIndex('match_events', 'idx_match_events_player_team'))) {
      await queryInterface.addIndex('match_events', ['playerId', 'teamId'], {
        name: 'idx_match_events_player_team',
      });
    }

    if (!(await hasIndex('match_events', 'idx_match_events_match_type'))) {
      await queryInterface.addIndex('match_events', ['matchId', 'eventType'], {
        name: 'idx_match_events_match_type',
      });
    }

    if (!(await hasIndex('match_events', 'idx_match_events_league_type'))) {
      await queryInterface.addIndex('match_events', ['leagueId', 'teamId', 'eventType'], {
        name: 'idx_match_events_league_type',
      });
    }

    // --- team_members indexes ---

    if (!(await hasIndex('team_members', 'idx_team_members_team'))) {
      await queryInterface.addIndex('team_members', ['teamId'], {
        name: 'idx_team_members_team',
      });
    }

    if (!(await hasIndex('team_members', 'idx_team_members_user'))) {
      await queryInterface.addIndex('team_members', ['userId'], {
        name: 'idx_team_members_user',
      });
    }

    // --- notifications index ---

    if (!(await hasIndex('notifications', 'idx_notifications_user_read'))) {
      await queryInterface.addIndex('notifications', ['userId', 'readAt'], {
        name: 'idx_notifications_user_read',
      });
    }

    // --- match_referee_assignments index ---

    if (!(await hasIndex('match_referee_assignments', 'idx_referee_assignments_match_status'))) {
      await queryInterface.addIndex('match_referee_assignments', ['matchId', 'status'], {
        name: 'idx_referee_assignments_match_status',
      });
    }
  },

  async down(queryInterface) {
    const dropIndexIfExists = async (table, name) => {
      const indexes = await queryInterface.showIndex(table);
      if (indexes.some((idx) => idx.name === name)) {
        await queryInterface.removeIndex(table, name);
      }
    };

    await dropIndexIfExists('match_referee_assignments', 'idx_referee_assignments_match_status');
    await dropIndexIfExists('notifications', 'idx_notifications_user_read');
    await dropIndexIfExists('team_members', 'idx_team_members_user');
    await dropIndexIfExists('team_members', 'idx_team_members_team');
    await dropIndexIfExists('match_events', 'idx_match_events_league_type');
    await dropIndexIfExists('match_events', 'idx_match_events_match_type');
    await dropIndexIfExists('match_events', 'idx_match_events_player_team');
    await dropIndexIfExists('matches', 'idx_matches_league_season');
    await dropIndexIfExists('matches', 'idx_matches_away_played_date');
    await dropIndexIfExists('matches', 'idx_matches_home_played_date');
    await dropIndexIfExists('matches', 'idx_matches_league_played');
  },
};

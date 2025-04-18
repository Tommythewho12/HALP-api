const dbServices = {
  createUser: (db, displayName, email, password) => {
    const stmt = db.prepare(`INSERT INTO user (display_name, email, password) VALUES (?, ?, ?)`);
    return stmt.run(displayName, email, password).lastInsertRowid;
  },

  getUsers: (db) => {
    const stmt = db.prepare(`SELECT * FROM user`);
    return stmt.all();
  },

  getUserById: (db, userId) => {
    const stmt = db.prepare(`SELECT * FROM user WHERE id=?`);
    return stmt.get(userId);
  },

  getUserByEmail: (db, email) => {
    const stmt = db.prepare(`SELECT * FROM user WHERE email=?`);
    return stmt.get(email);
  },

  existsUserWithDisplayName: (db, displayName) => {
    const stmt = db.prepare(`SELECT COUNT(*) as 'exists' FROM user WHERE display_name=?`);
    return stmt.get(displayName).exists === 1;
  },

  createTeam: (db, teamName, adminId) => {
    const stmt = db.prepare(`INSERT INTO team (name, admin_id) VALUES (?, ?)`);
    return stmt.run(teamName, adminId).lastInsertRowid;
  },

  removeTeam: (db, teamId, adminId) => {
    const stmt = db.prepare(`DELETE FROM team WHERE id=? AND admin_id=?`);
    return stmt.run(teamId, adminId).changes;
  },

  getTeams: (db, adminId) => {
    const stmt = db.prepare(`SELECT * FROM team WHERE admin_id=?`);
    return stmt.all(adminId);
  },

  getTeamById: (db, teamId, adminId) => {
    const stmt = db.prepare(`SELECT * FROM team WHERE id=? AND admin_id=?`);
    return stmt.get(teamId, adminId);
  },

  existsTeamWithName: (db, teamName, adminId) => {
    const stmt = db.prepare(`SELECT COUNT(*) as 'exists' FROM team WHERE name=? AND admin_id=?`);
    return stmt.get(teamName, adminId).exists === 1;
  },

  createUserXTeam: (db, userId, teamId) => {
    const stmt = db.prepare(`INSERT INTO userXteam VALUES (?, ?)`);
    return stmt.run(userId, teamId);
  },

  removeUserXTeam: (db, userId, teamId) => {
    const stmt = db.prepare(`DELETE FROM userXteam WHERE user_id=? AND team_id=?`);
    return stmt.run(userId, teamId).changes;
  },

  createEvent: (db, teamId, eventName, dateTime, jobTypes) => {
    const stmt_event = db.prepare(`INSERT INTO event (name, start_datetime, team_id) VALUES (?, ?, ?)`);
    const eventId = stmt_event.run(eventName, dateTime, teamId).lastInsertRowid;
    const stmt_job = db.prepare(`INSERT INTO job (type, event_id) VALUES (UPPER(?), ?)`);
    for (let jobType in jobTypes) {
      for (let i = 0; i < jobTypes[jobType]; i++) {
        stmt_job.run(jobType, eventId);
      }
    }
  },

  removeEvent: (db, teamId, eventId) => {
    const stmt = db.prepare(`DELETE FROM event WHERE id=? AND team_id=?`);
    return stmt.run(eventId, teamId).changes;
  },

  getEventById: (db, eventId) => {
    const stmt = db.prepare(`SELECT * FROM event WHERE id=?`);
    return stmt.get(eventId);
  },

  getEventByIdAndTeamId: (db, eventId, teamId) => {
    const stmt = db.prepare(`SELECT * FROM event WHERE id=? AND team_id=?`);
    return stmt.get(eventId, teamId);
  },

  getEventsByTeamId: (db, teamId) => {
    const stmt = db.prepare(`SELECT * FROM event WHERE team_id=?`);
    return stmt.all(teamId);
  },

  getEventsBySubscriberId: (db, userId) => {
    const stmt = db.prepare(`SELECT e.* FROM event e JOIN userXteam uxt ON e.team_id=uxt.team_id WHERE uxt.user_id=?`);
    return stmt.all(userId);
  },

  createUserXEvent: (db, userId, eventId) => {
    const stmt = db.prepare(`INSERT INTO userXevent VALUES (?, ?)`);
    return stmt.run(userId, eventId);
  },

  removeUserXEvent: (db, userId, eventId) => {
    const stmt = db.prepare(`DELETE FROM userXevent WHERE user_id=? AND event_id=?`);
    return stmt.run(userId, eventId).changes;
  },

  getUserXEventsByEventId: (db, eventId) => {
    const stmt = db.prepare(`SELECT u.id, u.display_name FROM userXevent uxe JOIN user u ON u.id=uxe.user_id WHERE uxe.event_id=?`);
    return stmt.all(eventId);
  },

  createJob: (db, eventId, jobType) => {
    const stmt = db.prepare(`INSERT INTO job (event_id, type) VALUES (?, ?)`);
    return stmt.run(eventId, jobType).lastInsertRowid;
  },

  removeJob: (db, jobId, eventId) => {
    const stmt = db.prepare(`DELETE FROM job WHERE id=? AND event_id=?`);
    return stmt.run(jobId, eventId).changes;
  },

  getJobsByEventId: (db, eventId) => {
    const stmt = db.prepare(`SELECT j.id, j.type, u.id as helperId, u.display_name as helper FROM job j LEFT JOIN user u ON u.id=j.user_id WHERE j.event_id=?`);
    return stmt.all(eventId);
  },

  updateJobHelper: (db, jobId, eventId, userId) => {
    if (userId) {
      const stmt = db.prepare(`UPDATE job SET user_id=? WHERE id=? AND event_id=?`);
      return stmt.run(userId, jobId, eventId).changes;
    } else {
      const stmt = db.prepare(`UPDATE job SET user_id=NULL WHERE id=? AND event_id=?`);
      return stmt.run(jobId, eventId).changes;
    }
  }
}

export default dbServices;
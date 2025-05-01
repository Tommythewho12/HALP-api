import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// TODO: move path to .env
const SQLITE_PATH = "../sqlite-db/halp.db";
const INIT_SQL_PATH = "../sqlite-db/init_db.sql";
const EXPECTED_TABLES = [
  "user",
  "team",
  "userXteam",
  "event",
  "userXevent",
  "job",
];

const isDatabaseValid = (db) => {
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table';`).all();
  
  for (let table of tables) {
    if (!EXPECTED_TABLES.includes(table.name)) {
      return false;
    }
  }
  return EXPECTED_TABLES.length === tables.length;
};

const databaseInit = (db) => {
  console.info("initializing database");
  const dbInitScript = fs.readFileSync(path.join(import.meta.dirname, INIT_SQL_PATH), "utf8");
  db.exec(dbInitScript);
};

const db = new Database(SQLITE_PATH);
console.info("connected to database: ", SQLITE_PATH);
db.pragma('journal_mode = WAL');
  
if (!isDatabaseValid(db)) {
  databaseInit(db);
}

const dbServices = {
  createUser: (displayName, email, password) => {
    const stmt = db.prepare(`INSERT INTO user (display_name, email, password) VALUES (?, ?, ?)`);
    return stmt.run(displayName, email, password).lastInsertRowid;
  },
  
  updateUserRefreshToken: (userId, refreshToken) => {
    const stmt = db.prepare(`UPDATE user SET refresh_token=? WHERE id=?`);
    return stmt.run(refreshToken, userId);
  },
  
  clearUserRefreshToken: (email) => {
    const stmt = db.prepare(`UPDATE user SET refresh_token=NULL WHERE email=?`);
    return stmt.run(email);
  },
  
  getUserRefreshTokenByUserId: (userId) => {
    const stmt = db.prepare(`SELECT refresh_token as 'refreshToken' FROM user WHERE id=?`);
    return stmt.get(userId).refreshToken;
  },
  
  resetUserPassword: (email, password) => {
    const stmt = db.prepare(`UPDATE user SET password=? WHERE email=?`);
    return stmt.run(password, email).changes;
  },
  
  updateUserPassword: (userId, newPassword) => {
    const stmt = db.prepare(`UPDATE user SET password=? WHERE id=?`);
    return stmt.run(newPassword, userId).changes;
  },

  getUsers: () => {
    const stmt = db.prepare(`SELECT * FROM user`);
    return stmt.all();
  },

  getUserById: (userId) => {
    const stmt = db.prepare(`SELECT * FROM user WHERE id=?`);
    return stmt.get(userId);
  },
  
  getUserPasswordHashById: (userId) => {
    const stmt = db.prepare(`SELECT * FROM user WHERE id=?`);
    return stmt.get(userId).password;
  },

  getUserByEmail: (email) => {
    const stmt = db.prepare(`SELECT * FROM user WHERE email=?`);
    return stmt.get(email);
  },

  existsUserWithDisplayName: (displayName) => {
    const stmt = db.prepare(`SELECT COUNT(*) as 'exists' FROM user WHERE display_name=?`);
    return stmt.get(displayName).exists === 1;
  },

  createTeam: (teamName, adminId) => {
    const stmt = db.prepare(`INSERT INTO team (name, admin_id) VALUES (?, ?)`);
    return stmt.run(teamName, adminId).lastInsertRowid;
  },

  removeTeam: (teamId) => {
    const stmt = db.prepare(`DELETE FROM team WHERE id=?`);
    return stmt.run(teamId).changes;
  },

  // TODO: pagination, filters, ...
  getTeams: (userId) => {
    const stmt = db.prepare(`SELECT t.*, CASE WHEN uxt.team_id IS NOT NULL THEN TRUE ELSE FALSE END AS isSubscribed FROM team t LEFT JOIN (SELECT * FROM userXteam WHERE user_id=?) uxt ON t.id=uxt.team_id`);
    return stmt.all(userId);
  },
  
  getTeamAdminId: (teamId) => {
    const stmt = db.prepare(`SELECT admin_id FROM team WHERE id=?`);
    const adminId = stmt.get(teamId);
    return adminId ? adminId.admin_id : -1;
  },

  getTeamById: (teamId) => {
    const stmt = db.prepare(`SELECT t.id as teamId, t.name as teamName, u.display_name as adminName FROM team t JOIN user u ON u.id=t.admin_id WHERE t.id=?`);
    return stmt.get(teamId);
  },

  existsTeamWithName: (teamName, adminId) => {
    const stmt = db.prepare(`SELECT COUNT(*) as 'exists' FROM team WHERE name=? AND admin_id=?`);
    return stmt.get(teamName, adminId).exists === 1;
  },

  createUserXTeam: (userId, teamId) => {
    const stmt = db.prepare(`INSERT INTO userXteam VALUES (?, ?)`);
    return stmt.run(userId, teamId);
  },

  removeUserXTeam: (userId, teamId) => {
    const stmt = db.prepare(`DELETE FROM userXteam WHERE user_id=? AND team_id=?`);
    return stmt.run(userId, teamId).changes;
  },
  
  getUserXTeamByTeamId: (teamId) => {
    const stmt = db.prepare(`SELECT u.id, u.display_name FROM userXteam uxt JOIN user u ON uxt.user_id=u.id WHERE uxt.team_id=?`);
    return stmt.all(teamId);
  },

  createEvent: (teamId, eventName, description, dateTime, jobTypes) => {
    const stmt_event = db.prepare(`INSERT INTO event (name, description, start_datetime, team_id) VALUES (?, ?, ?)`);
    const eventId = stmt_event.run(eventName, description, dateTime, teamId).lastInsertRowid;
    const stmt_job = db.prepare(`INSERT INTO job (type, event_id) VALUES (UPPER(?), ?)`);
    for (let jobType in jobTypes) {
      for (let i = 0; i < jobTypes[jobType]; i++) {
        stmt_job.run(jobType, eventId);
      }
    }
    return eventId;
  },

  removeEvent: (teamId, eventId) => {
    const stmt = db.prepare(`DELETE FROM event WHERE id=? AND team_id=?`);
    return stmt.run(eventId, teamId).changes;
  },

  getEventById: (eventId) => {
    const stmt = db.prepare(`SELECT * FROM event WHERE id=?`);
    return stmt.get(eventId);
  },

  getEventByIdAndTeamId: (eventId, teamId) => {
    const stmt = db.prepare(`SELECT * FROM event WHERE id=? AND team_id=?`);
    return stmt.get(eventId, teamId);
  },

  getEventsByTeamId: (teamId) => {
    const stmt = db.prepare(`SELECT * FROM event WHERE team_id=?`);
    return stmt.all(teamId);
  },

  getEventsBySubscriberId: (userId) => {
    const stmt = db.prepare(`SELECT e.* FROM event e JOIN userXteam uxt ON e.team_id=uxt.team_id WHERE uxt.user_id=?`);
    return stmt.all(userId);
  },

  createUserXEvent: (userId, eventId) => {
    const stmt = db.prepare(`INSERT INTO userXevent VALUES (?, ?)`);
    return stmt.run(userId, eventId);
  },

  removeUserXEvent: (userId, eventId) => {
    const stmt = db.prepare(`DELETE FROM userXevent WHERE user_id=? AND event_id=?`);
    return stmt.run(userId, eventId).changes;
  },

  getUserXEventsByEventId: (eventId) => {
    const stmt = db.prepare(`SELECT u.id, u.display_name FROM userXevent uxe JOIN user u ON u.id=uxe.user_id WHERE uxe.event_id=?`);
    return stmt.all(eventId);
  },
  
  getUserXEventsByUserIdAndEventId: (userId, eventId) => {
    const stmt = db.prepare(`SELECT COUNT(*) AS 'exists' FROM userXevent WHERE user_id=? AND event_id=?`);
    return stmt.get(userId, eventId).exists === 1;
  },

  createJob: (eventId, jobType) => {
    const stmt = db.prepare(`INSERT INTO job (event_id, type) VALUES (?, ?)`);
    return stmt.run(eventId, jobType).lastInsertRowid;
  },

  removeJob: (jobId, eventId) => {
    const stmt = db.prepare(`DELETE FROM job WHERE id=? AND event_id=?`);
    return stmt.run(jobId, eventId).changes;
  },

  getJobsByEventId: (eventId) => {
    const stmt = db.prepare(`SELECT j.id, j.type, u.id as helperId, u.display_name as helper FROM job j LEFT JOIN user u ON u.id=j.user_id WHERE j.event_id=?`);
    return stmt.all(eventId);
  },

  updateJobHelper: (jobId, eventId, userId) => {
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

process.on("exit", () => {
  console.info("closing connection to database");
  db.close((err) => {if (err) return console.error(err.message);});
});
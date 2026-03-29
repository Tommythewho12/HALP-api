import fs from "node:fs";
import path from "node:path";
import SqliteDb, { type Database, type SqliteError } from "better-sqlite3";
import { getSingleResult } from "../db-utils.js";

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

const isDatabaseValid = (sqliteDb: Database) => {
    const tables = sqliteDb.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();

    for (let table of tables) {
        if (!EXPECTED_TABLES.includes(table.name)) {
            return false;
        }
    }
    return EXPECTED_TABLES.length === tables.length;
};

const databaseInit = (sqliteDb: Database) => {
    console.info("initializing database");
    const dbInitScript = fs.readFileSync(path.join(import.meta.dirname, INIT_SQL_PATH), "utf8");
    sqliteDb.exec(dbInitScript);
};

const db = new SqliteDb(SQLITE_PATH);
console.info("connected to database: ", SQLITE_PATH);
db.pragma('journal_mode = WAL');

if (!isDatabaseValid(db)) {
    databaseInit(db);
}

type XX = { password: string };

const dbServices = {
    createUser: (displayName: string, email: string, password: string) => {
        const stmt = db.prepare(`INSERT INTO user (display_name, email, password) VALUES (?, ?, ?)`);
        return stmt.run(displayName, email, password).lastInsertRowid;
    },

    updateUserRefreshToken: (userId: number, refreshToken: string) => {
        const stmt = db.prepare(`UPDATE user SET refresh_token=? WHERE id=?`);
        return stmt.run(refreshToken, userId);
    },

    clearUserRefreshToken: (email: string) => {
        const stmt = db.prepare(`UPDATE user SET refresh_token=NULL WHERE email=?`);
        return stmt.run(email);
    },

    getUserRefreshTokenByUserId: (userId: number) => {
        const stmt = db.prepare(`SELECT refresh_token AS res FROM user WHERE id=?`);
        return getSingleResult<string>(stmt.get(userId));
    },

    resetUserPassword: (email: string, password: string) => {
        const stmt = db.prepare(`UPDATE user SET password=? WHERE email=?`);
        return stmt.run(password, email).changes;
    },

    updateUserPassword: (userId: number, newPassword: string) => {
        const stmt = db.prepare(`UPDATE user SET password=? WHERE id=?`);
        return stmt.run(newPassword, userId).changes;
    },

    getUsers: () => {
        const stmt = db.prepare(`SELECT * FROM user`);
        return stmt.all();
    },

    getUserById: (userId: number) => {
        const stmt = db.prepare(`SELECT id, display_name, email FROM user WHERE id=?`);
        return stmt.get(userId);
    },

    getUserPasswordHashById: (userId: number) => {
        const stmt = db.prepare(`SELECT password AS res FROM user WHERE id=?`);
        return getSingleResult<string>(stmt.get(userId));
    },

    getUserByEmail: (email: string) => {
        const stmt = db.prepare(`SELECT * FROM user WHERE email=?`);
        return stmt.get(email);
    },

    createTeam: (teamName: string, adminId: number) => {
        const stmt = db.prepare(`INSERT INTO team (name, admin_id) VALUES (?, ?)`);
        return stmt.run(teamName, adminId).lastInsertRowid;
    },

    removeTeam: (teamId: number) => {
        const stmt = db.prepare(`DELETE FROM team WHERE id=?`);
        return stmt.run(teamId).changes;
    },

    // TODO: pagination, filters, ...
    // 
    getAllTeams: (userId: number) => {
        const stmt = db.prepare(`
            SELECT 
                *,
                CASE WHEN admin_id = ? THEN TRUE ELSE FALSE END AS is_admin
            FROM team`);
        return stmt.all(userId);
    },

    getEnrichedTeams: (userId: number) => {
        const stmt = db.prepare(`
            SELECT 
                t.*, 
                CASE WHEN uxt.team_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_subscribed,
                CASE WHEN t.admin_id = @userId THEN TRUE ELSE FALSE END AS is_admin
            FROM team t 
            LEFT JOIN (SELECT * FROM userXteam WHERE user_id=@userId) uxt 
                ON t.id=uxt.team_id`);
        return stmt.all({ userId });
    },

    getTeamsByAdminId: (teamId: number) => {
        const stmt = db.prepare(`
            SELECT 
                *
            FROM team
            WHERE admin_id=?`);
        return stmt.all(teamId);
    },

    getTeamAdminId: (teamId: number) => {
        const stmt = db.prepare(`SELECT admin_id AS res FROM team WHERE id=?`);
        return getSingleResult<number>(stmt.get(teamId));
    },

    getTeamById: (userId: number, teamId: number) => {
        const stmt = db.prepare(`
      SELECT 
        t.id, 
        t.name, 
        u.display_name as admin_name, 
        CASE WHEN uxt.team_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_subscribed 
      FROM team t 
      JOIN user u 
        ON u.id=t.admin_id 
      LEFT JOIN (SELECT * FROM userXteam WHERE user_id=?) uxt 
        ON t.id=uxt.team_id 
      WHERE t.id=?`);
        return stmt.get(userId, teamId);
    },

    getTeamByIdAsAdmin: (teamId: number) => {
        // TODO make SQL to fetch team with all subscribers to avoid executing 2 SQL commands in teams.js GET '/:teamId'
    },

    createUserXTeam: (userId: number, teamId: number) => {
        const stmt = db.prepare(`INSERT INTO userXteam VALUES (?, ?)`);
        return stmt.run(userId, teamId);
    },

    removeUserXTeam: (userId: number, teamId: number) => {
        const stmt = db.prepare(`DELETE FROM userXteam WHERE user_id=? AND team_id=?`);
        return stmt.run(userId, teamId).changes;
    },

    getUserXTeamByTeamId: (teamId: number) => {
        const stmt = db.prepare(`SELECT u.id, u.display_name FROM userXteam uxt JOIN user u ON uxt.user_id=u.id WHERE uxt.team_id=?`);
        return stmt.all(teamId);
    },

    // TODO create major issue for below use case: either allow customizable Roles or give a fixed preset
    // TODO either stay agnostic here as the object that is delivered (e.g. can have scorer or not and many others) or define static
    createEvent: (teamId: number, eventName: string, description: string, dateTimeInSeconds: number, jobTypes: { scorer: number, official: number }) => {
        // Datetime must be passed in seconds not miliseconds!
        const stmt_event = db.prepare(`
            INSERT INTO event (name, description, start_datetime, team_id, complete)
            VALUES (?, ?, ?, ?, 0)`);
        const eventId = stmt_event.run(eventName, description, dateTimeInSeconds, teamId).lastInsertRowid;
        const stmt_job = db.prepare(`INSERT INTO job (type, event_id) VALUES (UPPER(?), ?)`);

        for (const [jobType, count] of Object.entries(jobTypes) as [keyof typeof jobTypes, number][]) {
            for (let i = 0; i < count; i++) {
                stmt_job.run(jobType, eventId);
            }
        }
        return eventId;
    },

    removeEvent: (teamId: number, eventId: number) => {
        const stmt = db.prepare(`DELETE FROM event WHERE id=? AND team_id=?`);
        return stmt.run(eventId, teamId).changes;
    },

    getEventById: (eventId: number) => {
        const stmt = db.prepare(`
            SELECT *
            FROM event
            WHERE id = ?`);
        return stmt.get(eventId);
    },

    getEventAndAdminByEventId: (eventId: number, userId: number) => {
        const stmt = db.prepare(`
            SELECT
                u.id AS admin_id, u.display_name AS admin_name, u.email AS admin_email,
                e.id AS event_id, e.name AS event_name, e.description AS event_description, 
                    e.start_datetime AS event_start_datetime, e.team_id AS event_team_id, 
                    e.complete AS event_complete,
                t.id AS team_id, t.name AS team_name, t.admin_id AS team_admin_id,
                EXISTS (
                    SELECT 1 FROM userXevent
                    WHERE event_id = e.id AND user_id = @userId
                ) is_volunteering,
                EXISTS (
                    SELECT 1 FROM job
                    WHERE event_id = e.id AND user_id = @userId
                ) AS is_assigned
            FROM
                user AS u
            JOIN
                team AS t
            ON
                t.admin_id = u.id
            JOIN
                event AS e
            ON
                e.team_id = t.id
            WHERE
                event_id = @eventId
            `);
        return stmt.get({ eventId, userId });
    },

    getEnrichedEventByIdAndUserId: (eventId: number, userId: number) => {
        const stmt = db.prepare(`
        SELECT 
            e.*,
            CASE WHEN uxe.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_subscribed,
            CASE WHEN j.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_assigned
        FROM event e 
        INNER JOIN userXteam uxt 
            ON e.team_id=uxt.team_id
        LEFT JOIN userXevent uxe
            ON e.id = uxe.event_id AND uxe.user_id = uxt.user_id
        LEFT JOIN job j
            ON e.id = j.event_id AND j.user_id = uxt.user_id
        WHERE e.id = ? AND uxt.user_id = ?`);
        return stmt.get(eventId, userId);
    },

    getEventByIdAndTeamId: (eventId: number, teamId: number) => {
        const stmt = db.prepare(`SELECT * FROM event WHERE id=? AND team_id=?`);
        return stmt.get(eventId, teamId);
    },

    getEventsByTeamId: (teamId: number) => {
        const stmt = db.prepare(`SELECT * FROM event WHERE team_id=?`);
        return stmt.all(teamId);
    },

    // fetch all events from teams I am subscribed to
    getEventsBySubscriberId: (userId: number) => {
        const stmt = db.prepare(`
            SELECT 
                e.* 
            FROM event e 
            JOIN userXteam uxt 
                ON e.team_id=uxt.team_id 
            WHERE 
                uxt.user_id=?
            `);
        return stmt.all(userId);
    },

    // deprecated
    getEnrichedEventsBySubscriberId: (userId: number) => {
        const stmt = db.prepare(`
            SELECT
                e.*,
                CASE WHEN uxe.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_subscribed,
                CASE WHEN j.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_assigned
            FROM event e
            INNER JOIN userXteam uxt
                ON e.team_id=uxt.team_id
            LEFT JOIN userXevent uxe
                ON e.id = uxe.event_id AND uxe.user_id = uxt.user_id
            LEFT JOIN job j
                ON e.id = j.event_id AND j.user_id = uxt.user_id
            WHERE
                uxt.user_id = ?`);
        return stmt.all(userId);
    },

    getEventsBySubscriberIdAsAdmin: (userId: number) => {
        const stmt = db.prepare(`
            SELECT
                e.*
            FROM event e
            INNER JOIN team t
                ON e.team_id = t.id
            WHERE
                t.admin_id = ?`);
        return stmt.all(userId);
    },

    getEventsBySubscriberIdAsVolunteer: (userId: number) => {
        const stmt = db.prepare(`
            SELECT
                e.*,
                CASE WHEN j.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_assigned
            FROM event e
            INNER JOIN userXevent uxe
                ON e.id = uxe.event_id
            LEFT JOIN job j
                ON e.id = j.event_id AND
                    j.user_id = uxe.user_id
            WHERE
                uxe.user_id = ?`);
        return stmt.all(userId);
    },

    // this excludes events already volunteered for
    getEventsBySubscriberIdAsSubscriberOnly: (userId: number) => {
        const stmt = db.prepare(`
            SELECT
                e.*
            FROM event e
            INNER JOIN userXteam uxt
                ON e.team_id=uxt.team_id
            LEFT JOIN userXevent uxe
                ON e.id = uxe.event_id
                    AND uxe.user_id = uxt.user_id
            WHERE
                uxt.user_id = ?
                    AND uxe.event_id IS NULL`);
        return stmt.all(userId);
    },

    getEventsBySubscriberIdAsSubscriber: (userId: number) => {
        const stmt = db.prepare(`
            SELECT
                e.*,
                CASE WHEN uxe.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_subscribed,
                CASE WHEN j.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_assigned
            FROM event e
            INNER JOIN userXteam uxt
                ON e.team_id=uxt.team_id
            LEFT JOIN userXevent uxe
                ON e.id = uxe.event_id AND uxe.user_id = uxt.user_id
            LEFT JOIN job j
                ON e.id = j.event_id AND j.user_id = uxt.user_id
            WHERE
                uxt.user_id = ?`);
        return stmt.all(userId);
    },

    // this includes all managed events and events from subscribed teams
    getEventsForUser: (userId: number) => {
        const stmt = db.prepare(`
            SELECT DISTINCT
                e.*,
                EXISTS (
                    SELECT 1 FROM userXevent
                    WHERE event_id = e.id AND user_id = @userId
                ) is_volunteering,
                EXISTS (
                    SELECT 1 FROM job
                    WHERE event_id = e.id AND user_id = @userId
                ) AS is_assigned
            FROM event e
            WHERE
                (EXISTS (
                    SELECT 1 FROM userXevent
                    WHERE event_id = e.id AND user_id = @userId
                )
                OR EXISTS (
                    SELECT 1 FROM userXteam
                    WHERE team_id = e.team_id AND user_id = @userId
                )
                OR EXISTS (
                    SELECT 1 FROM team
                    WHERE id = e.team_id AND admin_id = @userId
                ))
                AND start_datetime > strftime('%s','now','start of day')`);
        return stmt.all({ userId });
    },

    createUserXEvent: (userId: number, eventId: number) => {
        const stmt = db.prepare(`INSERT INTO userXevent VALUES (?, ?)`);
        return stmt.run(userId, eventId);
    },

    removeUserXEvent: (userId: number, eventId: number) => {
        const stmt = db.prepare(`DELETE FROM userXevent WHERE user_id=? AND event_id=?`);
        return stmt.run(userId, eventId).changes;
    },

    getUserXEventsByEventId: (eventId: number) => {
        const stmt = db.prepare(`
            SELECT
                u.id,
                u.display_name
            FROM userXevent uxe
            JOIN user u
                ON u.id=uxe.user_id
            WHERE uxe.event_id = ?`);
        return stmt.all(eventId);
    },

    // is user volunteering for event?
    getUserXEventsByUserIdAndEventId: (userId: number, eventId: number) => {
        const stmt = db.prepare(`
            SELECT EXISTS (
                SELECT 1 FROM userXevent WHERE user_id=? AND event_id=?
            ) AS res`);
        return getSingleResult<number>(stmt.get(userId, eventId));
    },

    createJob: (eventId: number, jobType: string) => {
        const stmt = db.prepare(`INSERT INTO job (event_id, type) VALUES (?, ?)`);
        return stmt.run(eventId, jobType).lastInsertRowid;
    },

    removeJob: (jobId: number, eventId: number) => {
        const stmt = db.prepare(`DELETE FROM job WHERE id=? AND event_id=?`);
        return stmt.run(jobId, eventId).changes;
    },

    getJobsByEventId: (eventId: number) => {
        const stmt = db.prepare(`
            SELECT
                j.id,
                j.type,
                j.user_id
            FROM job j
            WHERE j.event_id = ?`);
        return stmt.all(eventId);
    },

    updateJobHelper: (jobId: number, eventId: number, userId: number) => {
        if (userId) {
            const stmt = db.prepare(`UPDATE job SET user_id=? WHERE id=? AND event_id=?`);
            return stmt.run(userId, jobId, eventId).changes;
        } else {
            const stmt = db.prepare(`UPDATE job SET user_id=NULL WHERE id=? AND event_id=?`);
            return stmt.run(jobId, eventId).changes;
        }
    },

    isUserAssignedToJob: (eventId: number, userId: number) => {
        const stmt = db.prepare(`
            SELECT EXISTS (
                SELECT 1 FROM job WHERE event_id=? AND user_id=?
            ) AS res`);
        return getSingleResult<number>(stmt.get(eventId, userId));
    },

    // TODO test whether query:exists -> is_assigned is too expensive and remove
    getJobsOfEventByEventId: (eventId: number) => {
        const stmt = db.prepare(`
                SELECT
                    j.*,
                    u.display_name
                FROM
                    job j
                LEFT JOIN
                    user u
                ON
                    u.id = j.user_id
                WHERE
                    j.event_id = @eventId
            `);
        return stmt.all({ eventId });
    }
}

export default dbServices;

process.on("exit", () => {
    console.info("closing connection to database");
    db.close();
});
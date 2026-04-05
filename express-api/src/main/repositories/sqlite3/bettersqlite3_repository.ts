import fs from 'node:fs';
import path from 'node:path';
import SqliteDb, { type Database } from 'better-sqlite3';
import { getSingleResult, getListResult } from '../repository-utils.js';
import type { User } from '../../domain/models/User.js';
import type { RepositoryInterface } from '../repository-interface.js';
import type { TeamEnriched, Subscription, Team } from '../../domain/models/Team.js';
import type { EventEnriched, Event } from '../../domain/models/Event.js';
import type { EventEnrichedEntity, TeamEnrichedEntity, EventEntity, JobAndUsernameEntity, SubscriptionAndUserEntity, TeamEntity, UserEntity, VolunteeringAndUserEntity } from './sqlite3_entities.js';
import { toEnrichedEvent, toEnrichedEventOrUndefined, toEnrichedJob, toEnrichedTeam, toEvent, toEventOrUndefined, toSubscription, toTeamOrUndefined, toEnrichedVolunteering } from './sqlite3_mapper.js';
import type { UserCreator } from '../../domain/models/User.js';

// TODO: move path to .env
const SQLITE_PATH = 'dist/db';
const INIT_SQL_PATH = '../../resources/db/init_db.sql';
const EXPECTED_TABLES = [
    "user",
    "team",
    "userXteam",
    "event",
    "userXevent",
    "job",
    "auth"
];

const isDatabaseValid = (sqliteDb: Database) => {
    const tables = getListResult<string>(sqliteDb.prepare(`SELECT name as res FROM sqlite_master WHERE type='table'`).all());

    for (let table of tables) {
        if (!EXPECTED_TABLES.includes(table)) {
            return false;
        }
    }
    return EXPECTED_TABLES.length === tables.length;
};

const databaseInit = (sqliteDb: Database) => {
    console.info('initializing database');
    const dbInitScript = fs.readFileSync(path.join(import.meta.dirname, INIT_SQL_PATH), 'utf8');
    sqliteDb.exec(dbInitScript);
};

if (!fs.existsSync(SQLITE_PATH)) {
    console.info('creating directory ' + SQLITE_PATH);
    fs.mkdirSync(SQLITE_PATH, { recursive: true });
}
const db = new SqliteDb(SQLITE_PATH + '/halp.db');
console.info('connected to database: ', SQLITE_PATH);
db.pragma('journal_mode = WAL');

if (!isDatabaseValid(db)) {
    databaseInit(db);
}

export class BetterSqlite3Repository implements RepositoryInterface {

    // TODO
    // private db2 = new SqliteDb(SQLITE_PATH + '/halp.db');

    async createUser(user: UserCreator, password: string) {
        const stmt = db.prepare(`INSERT INTO user (display_name, email) VALUES (?, ?)`);
        const newUserId = stmt.run(user.displayName, user.email).lastInsertRowid;
        db.prepare(`INSERT INTO auth (id, password) VALUES (?, ?)`).run(newUserId, password);
        return String(newUserId);
    }

    async getUserById(userId: string): Promise<User | undefined> {
        const res = db.prepare(`
            SELECT *
            FROM user
            WHERE id=?`
        ).get(userId) as UserEntity | undefined;
        if (!res)
            return undefined
        return {
            id: String(res.id),
            displayName: res.display_name,
            email: res.email
        }
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const res = db.prepare(`
            SELECT *
            FROM user
            WHERE email=?`
        ).get(email) as UserEntity | undefined;
        if (!res)
            return undefined
        return {
            id: String(res.id),
            displayName: res.display_name,
            email: res.email
        }
    }

    async updateRefreshToken(userId: string, hashedToken: string) {
        db.prepare(`
            UPDATE auth
            SET refresh_token=?
            WHERE id=?`
        ).run(hashedToken, Number(userId));
    }

    async deleteRefreshToken(userId: string) {
        db.prepare(`
            UPDATE auth
            SET refresh_token=NULL
            WHERE id=?`
        ).run(Number(userId));
    }

    async getRefreshToken(userId: string): Promise<string | undefined> {
        return getSingleResult<string>(db.prepare(`
            SELECT refresh_token AS res
            FROM auth
            WHERE id=?`
        ).get(Number(userId)));
    }

    async updatePasswordByUserId(userId: string, newPassword: string) {
        db.prepare(`
            UPDATE auth
            SET password=?
            WHERE id=?`
        ).run(newPassword, Number(userId));
    }

    async updatePasswordByUserEmail(email: string, password: string) {
        db.prepare(`
            UPDATE auth
            SET password=?
            WHERE id=(SELECT id FROM user WHERE email=?)`
        ).run(password, email);
    }

    async getPassword(userId: string): Promise<string | undefined> {
        return getSingleResult<string>(db.prepare(`
            SELECT password AS res
            FROM auth
            WHERE id=?`
        ).get(Number(userId)));
    }

    async createTeam(team: Team): Promise<string> {
        const result = db.prepare(`INSERT INTO team (name, admin_id) VALUES (?, ?)`).run(team.name, team.adminId).lastInsertRowid;
        return String(result);
    }

    async deleteTeam(teamId: string) {
        db.prepare(`
            DELETE FROM team
            WHERE id=?`
        ).run(Number(teamId));
    }

    async getTeam(teamId: string): Promise<Team | undefined> {
        const teamEntity = db.prepare(`
            SELECT *
            FROM team
            WHERE id=?
            LIMIT 1`
        ).get(teamId) as TeamEntity | undefined;
        return toTeamOrUndefined(teamEntity);
    }

    // TODO: pagination, filters, ... 
    async getTeamsBySubscriberId(subscriberId: string): Promise<TeamEnriched[]> {
        const res = db.prepare(`
            SELECT 
                t.*, 
                CASE WHEN uxt.team_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_subscribed,
                CASE WHEN t.admin_id = @subscriberId THEN TRUE ELSE FALSE END AS is_admin
            FROM team t 
            LEFT JOIN (SELECT * FROM userXteam WHERE subscriber_id = @subscriberId) uxt 
                ON t.id=uxt.team_id`
        ).all({ subscriberId }) as TeamEnrichedEntity[];
        return res.map(item => toEnrichedTeam(item));
    }

    async isUserTeamAdmin(teamId: string, userId: string) {
        const res = getSingleResult<number>(db.prepare(`
            SELECT EXISTS (
                SELECT 1
                FROM team
                WHERE id=? AND admin_id=?
            ) AS res`
        ).get(Number(teamId), Number(userId)));
        return typeof res === 'number' && res === 1;
    }

    async createSubscription(userId: string, teamId: string) {
        const newId = db.prepare(`
            INSERT INTO userXteam
            VALUES (?, ?)`
        ).run(userId, teamId).lastInsertRowid;
        return String(newId);
    }

    async deleteSubscription(userId: string, teamId: string) {
        db.prepare(`
            DELETE FROM userXteam
            WHERE subscriber_id=? AND team_id=?`
        ).run(userId, teamId);
    }

    async getSubscriptionsByTeamId(teamId: string): Promise<Subscription[]> {
        const res = db.prepare(`
            SELECT uxt.team_id, u.*
            FROM userXteam uxt
            JOIN user u
            ON uxt.subscriber_id=u.id
            WHERE uxt.team_id=?`
        ).all(teamId) as SubscriptionAndUserEntity[];

        // TODO Check how 'uxt.team_id' translates in res
        console.debug(" [getSubscriptionsByTeamId] res: ", res, typeof res);

        return res.map(item => toSubscription(item));
    }

    async createEvent(event: Event) {
        // Datetime must be passed in epoch seconds not miliseconds!
        const newEventId = db.prepare(`
            INSERT INTO event (name, description, start_datetime, team_id, complete)
            VALUES (?, ?, ?, ?, 0)`
        ).run(event.name, event.description, event.startDatetime, event.teamId).lastInsertRowid;
        return String(newEventId);
    }

    async deleteEvent(eventId: string) {
        db.prepare(`
            DELETE FROM event
            WHERE id=?`
        ).run(eventId);
    }

    async getEvent(eventId: string) {
        const res = db.prepare(`
            SELECT *
            FROM event
            WHERE id = ?
            LIMIT 1`
        ).get(eventId) as EventEntity;
        return toEventOrUndefined(res);
    }

    async getEventsByTeamId(teamId: string) {
        const res = db.prepare(`
            SELECT *
            FROM event
            WHERE team_id=?`
        ).all(teamId) as EventEntity[];
        return res.map(item => toEvent(item));
    }

    // this is not ported with new interface / strategy pattern
    /* getEventAndAdminByEventId: (eventId: number, userId: number) => {
            const stmt = db.prepare(`
            SELECT
                u.id AS admin_id, u.display_name AS admin_name, u.email AS admin_email,
                e.id AS event_id, e.name AS event_name, e.description AS event_description, 
                    e.start_datetime AS event_start_datetime, e.team_id AS event_team_id, 
                    e.complete AS event_complete,
                t.id AS team_id, t.name AS team_name, t.admin_id AS team_admin_id,
                EXISTS (
                    SELECT 1 FROM userXevent
                    WHERE event_id = e.id AND volunteer_id = @userId
                ) is_volunteering,
                EXISTS (
                    SELECT 1 FROM job
                    WHERE event_id = e.id AND assignee_id = @userId
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
        },*/

    // TODO compare this SQL with below
    async getEnrichedEvent(eventId: string, userId: string): Promise<EventEnriched | undefined> {
        const res = db.prepare(`
            SELECT 
                e.*,
                CASE WHEN uxe.volunteer_id IS NOT NULL THEN 1 ELSE 0 END AS is_volunteering,
                CASE WHEN j.assignee_id IS NOT NULL THEN 1 ELSE 0 END AS is_assigned
            FROM event e 
            INNER JOIN userXteam uxt 
                ON e.team_id=uxt.team_id
            LEFT JOIN userXevent uxe
                ON e.id = uxe.event_id AND uxe.volunteer_id = uxt.subscriber_id
            LEFT JOIN job j
                ON e.id = j.event_id AND j.assignee_id = uxt.subscriber_id
            WHERE e.id = ? AND uxt.subscriber_id = ?
            LIMIT 1`
        ).get(eventId, userId) as EventEnrichedEntity | undefined;
        return toEnrichedEventOrUndefined(res);
    }

    // this includes all managed events and events from subscribed teams
    async getEnrichedEventsByVolunteerId(userId: string) {
        const res = db.prepare(`
            SELECT DISTINCT
                e.*,
                EXISTS (
                    SELECT 1 FROM userXevent
                    WHERE event_id = e.id AND volunteer_id = @userId
                ) is_volunteering,
                EXISTS (
                    SELECT 1 FROM job
                    WHERE event_id = e.id AND assignee_id = @userId
                ) AS is_assigned
            FROM event e
            WHERE
                (EXISTS (
                    SELECT 1 FROM userXevent
                    WHERE event_id = e.id AND volunteer_id = @userId
                )
                OR EXISTS (
                    SELECT 1 FROM userXteam
                    WHERE team_id = e.team_id AND subscriber_id = @userId
                )
                OR EXISTS (
                    SELECT 1 FROM team
                    WHERE id = e.team_id AND admin_id = @userId
                ))
                AND start_datetime > strftime('%s','now','start of day')`
        ).all({ userId }) as EventEnrichedEntity[];
        return res.map(item => toEnrichedEvent(item));
    }

    async createVolunteering(userId: string, eventId: string) {
        const newVolunteeringId = db.prepare(`
            INSERT INTO userXevent
            VALUES (?, ?)`
        ).run(userId, eventId).lastInsertRowid;
        return String(newVolunteeringId);
    }

    async deleteVolunteering(eventId: string, userId: string) {
        db.prepare(`
            DELETE FROM userXevent
            WHERE volunteer_id=? AND event_id=?`
        ).run(userId, eventId);
    }

    async getVolunteeringsByEventId(eventId: string) {
        const res = db.prepare(`
            SELECT
                uxe.event_id,
                u.*
            FROM userXevent uxe
            JOIN user u
                ON u.id=uxe.volunteer_id
            WHERE uxe.event_id = ?`
        ).all(eventId) as VolunteeringAndUserEntity[];
        return res.map(item => toEnrichedVolunteering(item));
    }

    async isUserVolunteering(eventId: string, userId: string) {
        const res = getSingleResult<number>(db.prepare(`
            SELECT EXISTS (
                SELECT 1
                FROM userXevent
                WHERE event_id=? AND volunteer_id=?) as res`
        ).get(eventId, userId));
        return typeof res === 'number' && res === 1;
    }

    async isAssigned(eventId: string, userId: string) {
        const res = getSingleResult<number>(db.prepare(`
            SELECT EXISTS (
                SELECT 1
                FROM job
                WHERE event_id=? AND assignee_id=?) as res`
        ).get(eventId, userId));
        return typeof res === 'number' && res === 1;
    }

    // TODO create major issue for below use case: either allow customizable Roles or give a fixed preset
    // TODO either stay agnostic here as the object that is delivered (e.g. can have scorer or not and many others) or define static
    async createJob(eventId: string, jobType: string) {
        const newJobId = db.prepare(`
            INSERT INTO job (event_id, type)
            VALUES (?, UPPER(?))`
        ).run(eventId, jobType).lastInsertRowid;
        return String(newJobId);
    }

    async updateJob(jobId: string, userId: string | null) {
        if (typeof userId === 'string') {
            db.prepare(`
                UPDATE job
                SET assignee_id=?
                WHERE id=?`
            ).run(userId, jobId);
        } else {
            db.prepare(`
                UPDATE job
                SET assignee_id=NULL
                WHERE id=?`
            ).run(jobId);
        }
    }

    async deleteJob(jobId: string) {
        db.prepare(`
            DELETE FROM job
            WHERE id=?`
        ).run(jobId);
    }

    async getEnrichedJobsByEventId(eventId: string) {
        const res = db.prepare(`
            SELECT
                j.*,
                u.display_name as assignee_name
            FROM
                job j
            LEFT JOIN
                user u
            ON
                u.id = j.assignee_id
            WHERE
                j.event_id = @eventId`
        ).all({ eventId }) as JobAndUsernameEntity[];
        return res.map(item => toEnrichedJob(item));
    }
}

process.on('exit', () => {
    console.info('closing connection to database');
    db.close();
});
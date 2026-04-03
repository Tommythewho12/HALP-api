import express, { type Request, type Response } from 'express';
import { SqliteError } from 'better-sqlite3';

import { repository } from '../repositories/repository.js';
import eventsRoute from './events_admin.js';
import type { Team } from '../domain/models/Team.js';
import { errorJson, successJson } from './api-utils.js';

const router = express.Router();

router.post('/', async (req, res) => {
    if (!req.body.teamName || !req.body.userId) {
        // TODO
        throw new Error('missing teamname and or user id');
    }
    const teamNameSan = req.body.teamName.trim();
    const team: Team = {
        id: null,
        name: teamNameSan,
        adminId: req.body.userId
    }

    try {
        const newTeamId = await repository.createTeam(team);

        const newTeam = {
            id: newTeamId,
            name: teamNameSan,
            adminId: req.body.userId,
            subscriberIds: [],
            eventIds: {}
        };
        return res.status(202).json(newTeam);
    } catch (error) {
        if (error instanceof SqliteError) {
            // TODO extrapolate for other cases as well
            switch (error.code) {
                case 'SQLITE_CONSTRAINT_CHECK':
                case 'SQLITE_CONSTRAINT_NOTNULL':
                    // TODO return JSON
                    return res.status(400).send(errorJson('name cannot be blank'));
                case 'SQLITE_CONSTRAINT_UNIQUE':
                    if (error.message.includes('name')) {
                        console.warn('User creation failed: teamName [' + teamNameSan + '] already in use');
                    }
                    // TODO return JSON
                    return res.status(400).send(errorJson('name already in use. Please use different value'));
                default:
                    console.error('database error while creating user');
            }
        }
        console.error('unknown error while accessing database', error);
        // TODO make JSON everywhere
        return res.status(500).send(errorJson('server error'));
    }
});

/* --------------------- */
/* ---- user access ---- */
/* --------------------- */

// TODO: pagination, filter, ...
router.get('/', async (req, res) => {
    const userId = req.body.userId;
    if (userId && typeof userId === 'string') {
        const teams = await repository.getTeamsBySubscriberId(userId);
        return res.status(200).json(teams);
    }
    return res.status(400).json(errorJson('missing user id'));
});

// figure out whether user is admin of group
router.use('/:teamId', async (req, _res, next) => {
    if (req.params.teamId) {
        const isAdmin = await repository.isUserTeamAdmin(req.params.teamId, req.body.userId);
        req.body.isUserAdmin = isAdmin;
        console.debug(`userId: ${req.body.userId}; isAdmin? `, isAdmin);

        // TODO necessary?
        next();
    } else
        throw new Error('no team id provided');
});

// subscribe current user to team
router.post('/:teamId/subscribers', async (req, res) => {
    const resultJson = {
        team_id: req.params.teamId,
        user_id: req.body.userId
    };
    try {
        await repository.createSubscription(req.body.userId, req.params.teamId);
        return res.status(200).json(resultJson);
    } catch (err) {
        if (err instanceof SqliteError && err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            console.warn('user already subscribed to team');
            return res.status(200).json(resultJson);
        } else {
            return res.status(500).json(errorJson('whoopsie'));
        }
    }
});

// unsubscribe current user from team
router.delete('/:teamId/subscribers', async (req, res) => {
    try {
        await repository.deleteSubscription(req.params.teamId, req.body.userId);
        const resultJson = {
            team_id: req.params.teamId,
            user_id: req.body.userId
        }
        return res.status(200).json(resultJson);
    } catch (err) {
        return res.status(500).json(errorJson('whoopsie'));
    }
});

/* ---------------------- */
/* ---- admin access ---- */
/* ---------------------- */

const checkIfAdmin = (req: Request, res: Response, next: () => void) => {
    if (req.body.isUserAdmin) {
        next();
        return;
    }
    // TODO not conform to expressjs architecture
    console.warn('trying to execute priviledged actions on team without proper authorization');
    res.status(403).send('no permissions for this action');
};

// TODO: check efficiency of double getTeamById call
router.use('/:teamId', checkIfAdmin);

router.delete('/:teamId', async (req, res) => {
    await repository.deleteTeam(req.params.teamId);
    res.status(200).send(successJson('team deleted'));
});

router.use('/:teamId/events', eventsRoute);

export default router;
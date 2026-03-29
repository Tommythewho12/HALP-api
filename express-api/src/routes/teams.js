import express from "express";

import dbService from "../repositories/better-sqlite/sqlite3Repository.js";
import eventsRoute from "./events_admin.js";

const router = express.Router();

router.post('/', (req, res) => {
    const teamName = req.body.teamName ? req.body.teamName.trim() : null;

    try {
        const newTeamId = dbService.createTeam(teamName, req.body.userId);

        let newTeam = {
            id: newTeamId,
            name: teamName,
            adminId: req.body.userId,
            subscriberIds: [],
            eventIds: {}
        };
        // TODO return JSON
        return res.status(202).json(newTeam);
    } catch (error) {
        if (error instanceof SqliteError) {
            // TODO extrapolate for other cases as well
            switch (error.code) {
                case 'SQLITE_CONSTRAINT_CHECK':
                case 'SQLITE_CONSTRAINT_NOTNULL':
                    // TODO return JSON
                    return res.status(400).send("name cannot be blank");
                case 'SQLITE_CONSTRAINT_UNIQUE':
                    if (error.message.includes("name")) {
                        console.warn("User creation failed: displayName [" + displayName + "] already in use");
                    }
                    // TODO return JSON
                    return res.status(400).send("name already in use. Please use different value");
                default:
                    console.error('database error while creating user');
            }
        }
        console.error('unknown error while accessing database', error);
        // TODO make JSON everywhere
        return res.status(500).send('server error');
    }
});

/* --------------------- */
/* ---- user access ---- */
/* --------------------- */

// TODO: pagination, filter, ...
router.get('/', (req, res) => {
    const userId = req.body.userId;
    let teams;
    switch (req.query.as) {
        case 'admin':
            // TODO unused: remove
            teams = dbService.getTeamsByAdminId(userId);
            res.status(200).json(teams);
            break;
        default:
            teams = dbService.getEnrichedTeams(userId);
            res.status(200).json(teams);
    }
});

// figure out whether user is admin of group
router.use('/:teamId', (req, _res, next) => {
    const adminId = dbService.getTeamAdminId(req.params.teamId);
    req.body.isUserAdmin = req.body.userId === adminId;
    console.debug(`adminId: ${adminId}; userId: ${req.body.userId}; equal? `, req.body.isUserAdmin);
    // TODO necessary?
    next();
});

// subscribe current user to team
router.post('/:teamId/subscribers', (req, res) => {
    try {
        dbService.createUserXTeam(req.body.userId, req.params.teamId);
        const resultJson = {
            team_id: req.params.teamId,
            user_id: req.body.userId
        }
        res.status(200).json(resultJson);
    } catch (err) {
        if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
            res.status(200).json(resultJson);
            console.warn("user already subscribed to team");
        } else {
            res.status(500).json({ error: err });
        }
    }
});

// unsubscribe current user from team
router.delete('/:teamId/subscribers', (req, res) => {
    const deletedRows = dbService.removeUserXTeam(req.body.userId, req.params.teamId);
    const resultJson = {
        team_id: req.params.teamId,
        user_id: req.body.userId
    }
    if (deletedRows === 0) {
        console.warn("user not subscribed to team");
    }
    res.status(200).json(resultJson);
});

/* ----------------------- */
/* ---- hybrid access ---- */
/* ----------------------- */
// TODO unused: remove
router.get('/:teamId', (req, res) => {
    console.info(`received request against /auth/teams/${req.params.teamId}`);
    // TODO replace with single sql command
    const team = dbService.getTeamById(req.body.userId, req.params.teamId);
    team.isUserAdmin = req.body.isUserAdmin;
    if (team.isUserAdmin) {
        console.debug('user is admin');
        team.subscribers = dbService.getUserXTeamByTeamId(req.params.teamId);
    } else {
        console.debug('user is NOT admin');
    }
    res.status(200).json(team);
});

/* ---------------------- */
/* ---- admin access ---- */
/* ---------------------- */

const checkIfAdmin = (req, res, next) => {
    // if (adminId === -1) {
    //   res.status(404).send("team does not exist");
    //   return;
    // }

    if (req.body.isUserAdmin) {
        next();
        return;
    }
    console.warn("trying to execute priviledged actions on team without proper authorization");
    res.status(403).send("no permissions for this action");
};

// TODO: check efficiency of double getTeamById call
router.use("/:teamId", checkIfAdmin);

router.delete('/:teamId', (req, res) => {
    const deletedRows = dbService.removeTeam(req.params.teamId);
    if (deletedRows === 0) {
        console.error("cannot delete team because not exists; should not enter this code");
    }
    res.status(200).send("team deleted");
});

router.use('/:teamId/events', eventsRoute);

export default router;
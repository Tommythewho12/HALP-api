import express from "express";

import dbService from "../repositories/better-sqlite/sqlite3Repository.js";

const router = express.Router();

router.get('/', (req, res) => {
    // TODO: extend to possibly see events I am volunteering for but not subscribed to team
    // get events of teams I am subscribed to
    let events;
    switch (req.query.as) {
        case 'volunteer', 'subscriber', 'admin': // deprecated
            console.warn('using deprecated query')
        default:
            events = dbService.getEventsForUser(req.body.userId);
            res.status(200).json(events);
            break;
    }
});

router.get('/:eventId', (req, res) => {
    const entity = dbService.getEventAndAdminByEventId(req.params.eventId, req.body.userId);
    const jobs = dbService.getJobsOfEventByEventId(req.params.eventId);
    const isAssigned = entity.is_assigned;
    const result = {
        admin: {
            id: entity.admin_id,
            display_name: entity.admin_name,
            email: entity.admin_email
        },
        team: {
            id: entity.team_id,
            name: entity.team_name,
            amdin_id: entity.team_admin_id
        },
        event: {
            id: entity.admin_id,
            name: entity.admin_name,
            description: entity.event_description,
            start_datetime: entity.event_start_datetime,
            team_id: entity.event_team_id,
            complete: entity.event_complete,
            is_volunteering: entity.is_volunteering,
            is_assigned: isAssigned
        },
        jobs: jobs.map(j => ({
            id: j.id,
            type: j.type,
            assignee_id: j.user_id,
            assignee_name: isAssigned ? j.display_name : ''
        }))
    }
    res.status(200).json(result);
});

// volunteer for event
router.post('/:eventId/volunteers', (req, res) => {
    try {
        dbService.createUserXEvent(req.body.userId, req.params.eventId);
        res.status(202).send("volunteer added to event");
    } catch (err) {
        if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
            console.warn("POST:/auth/events/:eventId/volunteers - volunteer already assigned to event");
            res.status(202).send("volunteer added to event");
        } else {
            // TODO: better error handling
            console.error("trying to ", err);
            res.status(500).send("something went wrong");
        }
    }
});

router.delete('/:eventId/volunteers', (req, res) => {
    // if user already assigned, unvolunteering not permitted
    const isAssigned = dbService.isUserAssignedToJob(req.params.eventId, req.body.userId);
    if (isAssigned) {
        res.status(400).send('user is already assigned to a job within this event');
        return;
    }
    const deletedRows = dbService.removeUserXEvent(req.body.userId, req.params.eventId);
    if (deletedRows === 0) {
        console.warn("DELETE:/auth/events/:eventId/volunteers - user not volunteering to event");
    }
    res.status(200).send("volunteer withdrawn from event");
});

router.get('/:eventId', (req, res) => {
    console.info(`received request against /auth/events/${req.params.eventId}`);
    const event = dbService.getEnrichedEventByIdAndUserId(req.params.eventId, req.body.userId);
    res.status(200).json(event);
});

export default router;
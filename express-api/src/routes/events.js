import express from "express";

import Repository from "../repositories/Repository.js";

const router = express.Router();

router.get('/', async (req, res) => {
    // TODO: extend to possibly see events I am volunteering for but not subscribed to team
    // get events of teams I am subscribed to
    switch (req.query.as) {
        case 'volunteer', 'subscriber', 'admin': // deprecated
            console.warn('using deprecated query')
        default:
            const events = await Repository.getEnrichedEventsByVolunteerId(req.body.userId);
            res.status(200).json(events);
            break;
    }
});

router.get('/:eventId', async (req, res) => {
    console.debug('### req.params.eventId: ', req.params.eventId);
    console.debug('### req.body.userId: ', req.body.userId);
    const enrichedEvent = await Repository.getEnrichedEvent(req.params.eventId, req.body.userId);
    console.debug('### enrichedEvent: ', enrichedEvent);
    const jobs = await Repository.getJobsByEventId(req.params.eventId);
    console.debug('### jobs: ', jobs);
    const team = await Repository.getTeam(enrichedEvent.teamId);
    console.debug('### team: ', team);
    const admin = await Repository.getUserById(team.adminId);
    console.debug('### admin: ', admin);
    const isAssigned = enrichedEvent.isAssigned;
    const result = {
        admin: {
            id: admin?.id,
            display_name: admin?.displayName,
            email: admin?.email
        },
        team: {
            id: team?.id,
            name: team?.name,
            amdin_id: team?.adminId
        },
        event: {
            id: enrichedEvent?.id,
            name: enrichedEvent?.name,
            description: enrichedEvent?.description,
            start_datetime: enrichedEvent?.startDatetime,
            team_id: enrichedEvent?.teamId,
            complete: enrichedEvent?.complete,
            is_volunteering: enrichedEvent?.isVolunteering,
            is_assigned: isAssigned
        },
        jobs: jobs.map(j => ({
            id: j.id,
            type: j.type,
            assignee_id: j.user_id,
            assignee_name: j.user_id && isAssigned ? j.display_name : '' // only show names if i am assigned as well
        }))
    }
    res.status(200).json(result);
});

// volunteer for event
router.post('/:eventId/volunteers', async (req, res) => {
    try {
        await Repository.createUserXEvent(req.body.userId, req.params.eventId);
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

router.delete('/:eventId/volunteers', async (req, res) => {
    // if user already assigned, unvolunteering not permitted
    const isAssigned = await Repository.isUserAssignedToJob(req.params.eventId, req.body.userId);
    if (isAssigned) {
        res.status(400).send('user is already assigned to a job within this event');
        return;
    }
    const deletedRows = await Repository.removeUserXEvent(req.body.userId, req.params.eventId);
    if (deletedRows === 0) {
        console.warn("DELETE:/auth/events/:eventId/volunteers - user not volunteering to event");
    }
    res.status(200).send("volunteer withdrawn from event");
});

router.get('/:eventId', async (req, res) => {
    console.info(`received request against /auth/events/${req.params.eventId}`);
    const event = await Repository.getEnrichedEventByIdAndUserId(req.params.eventId, req.body.userId);
    res.status(200).json(event);
});

export default router;
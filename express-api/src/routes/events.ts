import express from 'express';
import { SqliteError } from 'better-sqlite3';

import { repository } from '../repositories/repository.js';
import { errorJson, successJson } from './api-utils.js';

const router = express.Router();

router.get('/', async (req, res) => {
    // TODO: extend to possibly see events I am volunteering for but not subscribed to team
    // get events of teams I am subscribed to
    switch (req.query.as) {
        // deprecated
        case 'volunteer':
        case 'subscriber':
        case 'admin':
            console.warn('using deprecated query')
        default:
            const events = await repository.getEnrichedEventsByVolunteerId(req.body.userId);
            res.status(200).json(events);
            break;
    }
});

router.get('/:eventId', async (req, res) => {
    try {
        const enrichedEvent = await repository.getEnrichedEvent(req.params.eventId, req.body.userId);
        if (!enrichedEvent)
            throw new Error('unable to find event');
        const team = await repository.getTeam(enrichedEvent.teamId);
        if (!team)
            throw new Error('unable to find team');
        const admin = await repository.getUserById(team.adminId);
        const jobs = await repository.getEnrichedJobsByEventId(req.params.eventId);
        const isAssigned = enrichedEvent.isAssigned;
        const result = {
            admin: {
                id: admin?.id,
                displayName: admin?.displayName,
                email: admin?.email
            },
            team: {
                id: team?.id,
                name: team?.name,
                adminId: team?.adminId
            },
            event: {
                id: enrichedEvent?.id,
                teamId: enrichedEvent?.teamId,
                name: enrichedEvent?.name,
                description: enrichedEvent?.description,
                startDatetime: enrichedEvent?.startDatetime,
                complete: enrichedEvent?.complete,
                isVolunteering: enrichedEvent?.isVolunteering,
                isAssigned: isAssigned
            },
            jobs: jobs.map(j => ({
                id: j.id,
                type: j.type,
                assignee_id: j.assigneeId,
                assignee_name: j.assigneeId && isAssigned ? j.assigneeName : '' // only show names if i am assigned as well
            }))
        }
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json(errorJson('internal server error'));
    }
});

// volunteer for event
router.post('/:eventId/volunteers', async (req, res) => {
    try {
        await repository.createVolunteering(req.params.eventId, req.body.userId);
        res.status(202).send('volunteer added to event');
    } catch (err) {
        if (err instanceof SqliteError) {
            if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                console.warn('POST:/auth/events/:eventId/volunteers - volunteer already assigned to event');
                res.status(202).send('volunteer added to event');
            } else {
                // TODO: better error handling
                console.error('trying to ', err);
                res.status(500).send('something went wrong');
            }
        }
        console.error('unknown error while accessing database', err);
        return res.status(500).send(errorJson('server error'));
    }
});

router.delete('/:eventId/volunteers', async (req, res) => {
    // if user already assigned, unvolunteering not permitted
    const isAssigned = await repository.isAssigned(req.params.eventId, req.body.userId);
    if (isAssigned) {
        return res.status(400).send(errorJson('user is already assigned to a job within this event'));
    }
    await repository.deleteVolunteering(req.body.userId, req.params.eventId);
    return res.status(200).send(successJson('volunteer withdrawn from event'));
});

router.get('/:eventId', async (req, res) => {
    console.info(`received request against /auth/events/${req.params.eventId}`);
    const event = await repository.getEnrichedEvent(req.params.eventId, req.body.userId);
    res.status(200).json(event);
});

export default router;
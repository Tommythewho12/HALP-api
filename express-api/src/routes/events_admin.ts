import express, { type Request } from 'express';

import Repository from '../repositories/Repository.js';
import { JOB_ENUM } from '../resources/constants.js';
import type { Event } from '../domain/models/Event.js';
import { errorJson, successJson } from './api-utils.js';

type CreateEventBody = {
    eventName: string
    description: string
    dateTime: number
    jobs: { scorer: number, official: number }
}

const router = express.Router({ mergeParams: true });

router.post('/', async (req: Request<{ teamId: string }, {}, CreateEventBody>, res) => {
    const eventName = req.body.eventName ? req.body.eventName.trim() : null;
    if (eventName === null) {
        return res.status(400).send(errorJson('event name must not be emtpy'));
    }

    // TODO: validate of type time
    const dateTime = req.body.dateTime;
    const description = req.body.description ? req.body.description : '';

    const newJobs = req.body.jobs ? req.body.jobs : {} as { scorer: number, official: number };
    if (!newJobs) {
        console.info('bad request: no jobs provided for creating event');
        res.status(400).send(errorJson('must specify required jobs'));
        return;
    }

    for (const [job, count] of Object.entries(newJobs)) {
        if (typeof job !== 'string' || !JOB_ENUM.includes(job.toUpperCase())) {
            return res.status(400).send(errorJson('invalid job type'));
        } else if (typeof count !== 'number' || count < 0) {
            return res.status(400).send(errorJson('invalid number of jobs'));
        }
    }

    const event: Event = {
        id: null,
        name: eventName,
        description: description,
        startDatetime: dateTime,
        teamId: req.params.teamId,
        complete: false
    }
    const eventId = await Repository.createEvent(event);
    for (const [job, count] of Object.entries(newJobs) as [keyof typeof newJobs, number][]) {
        for (let i = 0; i < count; i++) {
            await Repository.createJob(eventId, job);
        }
    }

    const newEvent = {
        id: eventId,
        team_id: req.params.teamId,
        name: eventName,
        description: description,
        start_datetime: dateTime,
        jobs: newJobs,
        complete: false,
        is_volunteering: false,
        is_assigned: false
    }
    return res.status(202).json(newEvent);
});

router.delete('/:eventId', async (req: Request<{ teamId: string, eventId: string }, {}, any>, res) => {
    await Repository.deleteEvent(req.params.eventId);
    return res.status(200).send(successJson('event deleted'));
});

router.get('/', async (req: Request<{ teamId: string, eventId: string }, {}, any>, res) => {
    const events = await Repository.getEventsByTeamId(req.params.teamId);
    return res.status(200).json(events);
});

// TODO add router.use to check if event is part of team and/or user(admin)

router.get('/:eventId', async (req: Request<{ teamId: string, eventId: string }, {}, any>, res) => {
    const event = await Repository.getEvent(req.params.eventId);
    if (!event) {
        res.status(404).json({ error: 'event not found' });
        return;
    }
    const volunteers = await Repository.getVolunteeringsByEventId(req.params.eventId);
    const jobs = await Repository.getJobsByEventId(req.params.eventId);

    res.status(200).json({ ...event, volunteers, jobs });
});


router.post('/:eventId/jobs', async (req, res) => {
    // TODO: validate jobsType

    try {
        await Repository.createJob(req.params.eventId, req.body.jobType);
        res.status(202).send(successJson('job added'));
    } catch (err) {
        console.error('POST:/auth/teams/:teamId/events/:eventId/jobs', err);
        res.status(500).send(errorJson('something went wrong'));
    }
});

router.delete('/:eventId/jobs/:jobId', async (req, res) => {
    await Repository.deleteJob(req.params.jobId);
    res.status(200).send(successJson('job removed'));
});

// assign/unassign user to job
router.patch('/:eventId/jobs/:jobId', async (req, res) => {
    // when adding check first if user is volunteering for event
    if (req.body.volunteerId !== undefined && req.body.volunteerId !== null) {
        const isVolunteering = await Repository.isUserVolunteering(req.params.eventId, req.body.volunteerId);
        if (!isVolunteering) {
            console.info('PATCH:/teams/:teamId/events/:eventId/jobs/:jobId - trying to assign user that does not volunteer to job');
            res.status(400).send(errorJson('cannot assign users not volunteering'));
            return;
        }
    }

    // then add volunteer to job
    try {
        await Repository.updateJob(req.params.jobId, req.body.volunteerId);
        if (req.body.volunteerId)
            res.status(200).send(successJson('volunteer assigned to job'));
        else
            res.status(200).send(successJson('volunteer unassigned from job'));
    } catch (err) {
        console.error(err);
        res.status(400).send(errorJson('trying to assign single volunteer to multiple jobs'));
    }
});

export default router;
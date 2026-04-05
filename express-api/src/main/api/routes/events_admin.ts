import express from 'express';

import { repository } from '../../repositories/repository-factory.js';
import { JobTypes } from '../../resources/constants.js';
import type { EventCreator } from '../../domain/models/Event.js';
import { errorJson, successJson, type RequestUserEnriched } from './api-utils.js';
import type { components } from '../../../../api-spec/generated/schema.js';

const router = express.Router({ mergeParams: true });

// TODO add typing!
router.post<
    '/',
    any,
    components['schemas']['DefaultSuccessResponseSchema'] | components['schemas']['DefaultErrorResponseSchema'],
    components['schemas']['EventCreateRequestSchema'] & RequestUserEnriched,
    any,
    any
>('/', async (req, res) => {
    const eventName = req.body.name ? req.body.name.trim() : null;
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
        console.debug('[events_admin] job, count: ', job.toUpperCase(), count);
        console.debug('[events_admin] typeof JOB_ENUM: ', JobTypes, typeof JobTypes);
        if (typeof job !== 'string' || !(job.toUpperCase() in JobTypes)) {
            return res.status(400).send(errorJson('invalid job type'));
        } else if (typeof count !== 'number' || count < 0) {
            return res.status(400).send(errorJson('invalid number of jobs'));
        }
    }

    const event: EventCreator = {
        name: eventName,
        description: description,
        startDatetime: dateTime,
        teamId: req.params.teamId,
        complete: false
    }
    const eventId = await repository.createEvent(event);
    for (const [job, count] of Object.entries(newJobs) as [keyof typeof newJobs, number][]) {
        for (let i = 0; i < count; i++) {
            await repository.createJob(eventId, job);
        }
    }

    return res.status(201).json(successJson('new event created'));
    // TODO return actual object instead
    /*const newEvent = {
        id: eventId,
        teamId: req.params.teamId,
        name: eventName,
        description: description,
        startDatetime: dateTime,
        jobs: newJobs,
        complete: false,
        isVolunteering: false,
        isAssigned: false
    }

    return res.status(201).json(newEvent);*/
});

router.delete<
    '/:eventId',
    any,
    components['schemas']['DefaultSuccessResponseSchema'] | components['schemas']['DefaultErrorResponseSchema'],
    any & RequestUserEnriched,
    any,
    any
>('/:eventId', async (req, res) => {
    await repository.deleteEvent(req.params.eventId);
    return res.status(200).send(successJson('event deleted'));
});

// TODO add router.use to check if event is part of team and/or user(admin)

router.get<
    '/:eventId',
    any,
    components['schemas']['EventManagedSchema'] | components['schemas']['DefaultErrorResponseSchema'],
    any & RequestUserEnriched,
    any,
    any
>('/:eventId', async (req, res) => {
    const event = await repository.getEvent(req.params.eventId);
    if (!event) {
        return res.status(404).json(errorJson('event not found'));
    }
    const volunteers = await repository.getVolunteeringsByEventId(req.params.eventId);
    const jobs = await repository.getEnrichedJobsByEventId(req.params.eventId);
    const assembledResult: components['schemas']['EventManagedSchema'] = {
        event: event,
        volunteers: volunteers,
        jobs: jobs.map(job => ({
            id: job.id,
            eventId: job.eventId,
            type: JobTypes[job.type],
            assignee: {
                ...(job.assigneeId != null && { id: job.assigneeId }),
                ...(job.assigneeName != null && { displayName: job.assigneeName }),
                ...(job.assigneeEmail != null && { email: job.assigneeEmail }),
            }
        }))
    }

    return res.status(200).json(assembledResult);
});


router.post<
    '/:eventId/jobs',
    any,
    components['schemas']['DefaultSuccessResponseSchema'] | components['schemas']['DefaultErrorResponseSchema'],
    components['schemas']['JobCreateRequestSchema'] & RequestUserEnriched,
    any,
    any
>('/:eventId/jobs', async (req, res) => {
    // TODO: validate jobsType

    try {
        await repository.createJob(req.params.eventId, req.body.jobType);
        // TODO return actual created object
        return res.status(201).send(successJson('job added'));
    } catch (err) {
        console.error('POST:/auth/teams/:teamId/events/:eventId/jobs', err);
        return res.status(500).send(errorJson('something went wrong'));
    }
});

router.delete<
    '/:eventId/jobs/:jobId',
    any,
    components['schemas']['DefaultSuccessResponseSchema'] | components['schemas']['DefaultErrorResponseSchema'],
    any & RequestUserEnriched,
    any,
    any
>('/:eventId/jobs/:jobId', async (req, res) => {
    await repository.deleteJob(req.params.jobId);
    res.status(200).send(successJson('job removed'));
});

// assign/unassign user to job
router.patch<
    '/:eventId/jobs/:jobId',
    any,
    components['schemas']['DefaultSuccessResponseSchema'] | components['schemas']['DefaultErrorResponseSchema'],
    components['schemas']['JobReassignRequestSchema'] & RequestUserEnriched,
    any,
    any
>('/:eventId/jobs/:jobId', async (req, res) => {
    // when adding check first if user is volunteering for event
    if (req.body.volunteerId !== undefined && req.body.volunteerId !== null) {
        const isVolunteering = await repository.isUserVolunteering(req.params.eventId, req.body.volunteerId);
        if (!isVolunteering) {
            console.info('PATCH:/teams/:teamId/events/:eventId/jobs/:jobId - trying to assign user that does not volunteer to job');
            res.status(400).send(errorJson('cannot assign users not volunteering'));
            return;
        }
    }

    // then add volunteer to job
    try {
        const volunteerIdParsed = req.body.volunteerId != undefined ? req.body.volunteerId : null;
        await repository.updateJob(req.params.jobId, volunteerIdParsed);
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
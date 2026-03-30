import express, { type Request } from "express";

import dbService from "../repositories/better-sqlite/sqlite3Repository.js";
import { JOB_ENUM } from "../resources/constants.js";

type CreateEventBody = {
    eventName: string
    description: string
    dateTime: number
    jobs: { scorer: number, official: number }
}

const router = express.Router({ mergeParams: true });

router.post('/', (req: Request<{ teamId: string }, {}, CreateEventBody>, res) => {
    const eventName = req.body.eventName ? req.body.eventName.trim() : null;
    if (eventName === null) {
        return res.status(400).send("event name must not be emtpy");
    }

    // TODO: validate of type time
    const dateTime = req.body.dateTime;
    const description = req.body.description ? req.body.description : '';

    const newJobs = req.body.jobs ? req.body.jobs : {} as { scorer: number, official: number };
    if (!newJobs) {
        console.info("bad request: no jobs provided for creating event");
        res.status(400).send("must specify required jobs");
        return;
    }

    for (const [job, count] of Object.entries(newJobs)) {
        if (typeof job !== "string" || !JOB_ENUM.includes(job.toUpperCase())) {
            return res.status(400).send("invalid job type");
        } else if (typeof count !== "number" || count < 0) {
            return res.status(400).send("invalid number of jobs");
        }
    }

    const eventId = dbService.createEvent(Number(req.params.teamId), eventName, description, dateTime, newJobs);
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

router.delete('/:eventId', (req: Request<{ teamId: string, eventId: string }, {}, any>, res) => {
    const deletedRows = dbService.removeEvent(Number(req.params.teamId), Number(req.params.eventId));
    if (deletedRows === 0) {
        console.info("cannot delete event because not exists");
    }
    res.status(200).send("event deleted");
});

router.get('/', (req: Request<{ teamId: string, eventId: string }, {}, any>, res) => {
    const events = dbService.getEventsByTeamId(Number(req.params.teamId));
    res.status(200).json(events);
});

// TODO add router.use to check if event is part of team and/or user(admin)

router.get('/:eventId', (req: Request<{ teamId: string, eventId: string }, {}, any>, res) => {
    const event = dbService.getEventById(Number(req.params.eventId));
    if (!event) {
        res.status(404).json({ error: "event not found" });
        return;
    }
    const volunteers = dbService.getUserXEventsByEventId(Number(req.params.eventId));
    const jobs = dbService.getJobsByEventId(Number(req.params.eventId));

    res.status(200).json({ ...event, volunteers, jobs });
});


router.post('/:eventId/jobs', (req, res) => {
    // TODO: validate jobsType

    try {
        dbService.createJob(Number(req.params.eventId), req.body.jobType);
        res.status(202).send("job added");
    } catch (err) {
        console.error("POST:/auth/teams/:teamId/events/:eventId/jobs", err);
        res.status(500).send("something went wrong");
    }
});

router.delete('/:eventId/jobs/:jobId', (req, res) => {
    const deletedRows = dbService.removeJob(Number(req.params.jobId), Number(req.params.eventId));
    if (deletedRows === 0) {
        console.warn("DELETE:/auth/teams/:teamId/events/:eventId/jobs/:jobId - job not assigned to eventId");
    }
    res.status(200).send("job removed");
});

// assign/unassign user to job
router.patch('/:eventId/jobs/:jobId', (req, res) => {
    // when adding check first if user is volunteering for event
    if (req.body.volunteerId !== undefined && req.body.volunteerId !== null) {
        const isVolunteering = dbService.getUserXEventsByUserIdAndEventId(req.body.volunteerId, Number(req.params.eventId));
        if (!isVolunteering) {
            console.info("PATCH:/teams/:teamId/events/:eventId/jobs/:jobId - trying to assign user that does not volunteer to job");
            res.status(400).send("cannot assign users not volunteering");
            return;
        }
    }

    // then add volunteer to job
    try {
        dbService.updateJobHelper(Number(req.params.jobId), Number(req.params.eventId), req.body.volunteerId);
        if (req.body.volunteerId)
            res.status(200).send("volunteer assigned to job");
        else
            res.status(200).send("volunteer unassigned from job");
    } catch (err) {
        console.error(err);
        res.status(400).send("trying to assign single volunteer to multiple jobs");
    }
});

export default router;
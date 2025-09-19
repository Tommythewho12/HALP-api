import express from "express";

import dbService from "../db-service.js";
import { JOB_ENUM } from "../resources/constants.js";

const router = express.Router({ mergeParams: true });

router.post('/', (req, res) => {
    const eventName = req.body.eventName ? req.body.eventName.trim() : '';
    // TODO: validate of type time
    const dateTime = req.body.dateTime;
    const description = req.body.description ? req.body.description : '';

    const newJobs = req.body.jobs ? req.body.jobs : {};
    if (!newJobs) {
        console.info("bad request: no jobs provided for creating event");
        res.status(400).send("must specify required jobs");
        return;
    }

    for (let job in newJobs) {
        if (typeof job !== "string" || !JOB_ENUM.includes(job.toUpperCase())) {
            res.status(400).send("invalid job type");
            return;
        } else if (typeof newJobs[job] !== "number" || newJobs[job] < 0) {
            res.status(400).send("invalid number of jobs");
            return;
        }
    }

    const eventId = dbService.createEvent(req.params.teamId, eventName, description, dateTime, newJobs);
    const newEvent = {
        id: eventId,
        name: eventName,
        description: description,
        dateTime: dateTime,
        jobs: newJobs
    }
    res.status(202).json(newEvent);
});

router.delete('/:eventId', (req, res) => {
    const deletedRows = dbService.removeEvent(req.params.teamId, req.params.eventId);
    if (deletedRows === 0) {
        console.info("cannot delete event because not exists");
    }
    res.status(200).send("event deleted");
});

router.get('/', (req, res) => {
    const events = dbService.getEventsByTeamId(req.params.teamId);
    res.status(200).json(events);
});

router.get('/:eventId', (req, res) => {
    const event = dbService.getEventById(req.params.eventId);
    if (!event) {
        res.status(404).json({ error: "event not found" });
        return;
    }
    const volunteers = dbService.getUserXEventsByEventId(req.params.eventId);
    const jobs = dbService.getJobsByEventId(req.params.eventId);

    res.status(200).json({ e: event, v: volunteers, j: jobs });
});


router.post('/:eventId/jobs', (req, res) => {
    // TODO: validate jobsType

    try {
        dbService.createJob(req.params.eventId, req.body.jobType);
        res.status(202).send("job added");
    } catch (err) {
        console.error("POST:/auth/teams/:teamId/events/:eventId/jobs", err);
        res.status(500).send("something went wrong");
    }
});

router.delete('/:eventId/jobs/:jobId', (req, res) => {
    const deletedRows = dbService.removeJob(req.params.jobId, req.params.eventId);
    if (deletedRows === 0) {
        console.warn("DELETE:/auth/teams/:teamId/events/:eventId/jobs/:jobId - job not assigned to eventId");
    }
    res.status(200).send("job removed");
});

// assign/unassign user to job
router.patch('/:eventId/jobs/:jobId', (req, res) => {
    // when adding check first if user is volunteering for event
    if (req.body.volunteerId !== undefined) {
        const isVolunteering = dbService.getUserXEventsByUserIdAndEventId(req.body.volunteerId, req.params.eventId);
        if (!isVolunteering) {
            console.info("PATCH:/teams/:teamId/events/:eventId/jobs/:jobId - trying to assign user that does not volunteer to job");
            res.status(400).send("cannot assign users not volunteering");
            return;
        }
    }

    // then add volunteer to job
    const changedRows = dbService.updateJobHelper(req.params.jobId, req.params.eventId, req.body.volunteerId);
    if (changedRows === 0) {
        // TODO: fix - does not catch idempotent "changes"
        console.warn("PUT:/auth/teams/:teamId/events/:eventId/jobs/:jobId - no changes performed");
    }
    res.status(200).send("helper un-/assigned");
});

export default router;
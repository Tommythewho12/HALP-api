import express from "express";

import dbService from "../db-service.js";
import { JOB_ENUM } from "../resources/constants.js";

const router = express.Router({ mergeParams: true });

router.post('/', (req, res) => {
  const eventName = req.body.eventName ? req.body.eventName.trim() : "";
  // TODO: validate of type time
  const dateTime = req.body.dateTime;

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

  const eventId = dbService.createEvent(req.params.teamId, eventName, dateTime, newJobs);
  const newEvent = {
    id: eventId,
    name: eventName,
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

  res.status(200).json({e:event, v:volunteers, j:jobs});
});

export default router;
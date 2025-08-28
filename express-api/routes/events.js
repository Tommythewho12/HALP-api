import express from "express";

import dbService from "../db-service.js";
import { JOB_ENUM } from "../resources/constants.js";

const router = express.Router();

router.get('/', (req, res) => {
  // TODO: extend to possibly see events I am volunteering for but not subscribed to team
  // get events of teams I am subscribed to
  const events = dbService.getEnrichedEventsBySubscriberId(req.body.userId);
  res.status(200).json(events);
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
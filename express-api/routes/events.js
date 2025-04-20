import express from "express";

import dbService from "../db-service.js";
import { JOB_ENUM } from "../resources/constants.js";

const router = express.Router();

router.get('/', (req, res) => {
  const events = dbService.getEventsBySubscriberId(req.body.userId);
  res.status(200).json(events);
});

// cont add volunteer to event

export default router;
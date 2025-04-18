// INFO to start type in cmd: node app.js
'use strict';

import express from "express";
import sqlite from "better-sqlite3";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";

import indexRoute from "./routes/index.js";
import authRoute from "./routes/auth.js";
import dbServices from "./db-service.js";

// TODO: outsource into .env file; remember to ignore .env in gitignore
const PORT = process.env.HALP_API_PORT | 3000;
// const NODE_ENV = 'production'; // TODO: set for prod

const app = express();

// TODO: separate app.js/index.js from other logic
/*const main = async () => {
  const db = new sqlite3.Database("my.db");
  try {
    await execute(
      db,
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        price DECIMAL(10, 2) NOT NULL)`
    );
  } catch (error) {
    console.log(error);
  } finally {
    db.close();
  }
};

main();*/

// TODO:write script here to start db if not yet exists.


const JOB_ENUM = [
  "SCORER",
  "BALLER",
  "CLEANER",
  "OFFICIAL"
];

const fetchUserByAuth = () => {
  return dbServices.getUserByEmail(db, "t@gmx.net");
};

// TODO: remove logger?
// const loggerFunction = (req, res, next) => {
  // console.log("i am logging");
  // next();
// };

app.use(bodyParser.json());
// app.use(loggerFunction);

app.use('/', indexRoute);
app.use('/auth', authRoute);



// TODO:fix and test in Postman; actually remove?
app.patch('/users', (req, res) => {
  let user = findUser("t");
  const newJobs = [];
  for (let job of JOBS) {
    if (req.body[job] === true)
      newJobs.push(job);
  }
  user.jobs = newJobs;
  res.status(200).json(user);
});


app.post('/teams/:teamId/events', (req, res) => {
  const eventName = req.body.eventName ? req.body.eventName.trim() : "";
  const dateTime = req.body.dateTime;

  const adminUser = fetchUserByAuth();

  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (!team) {
    res.status(404).json({ error: "team not found" });
    return;
  }

  const newJobs = req.body.jobs ? req.body.jobs : {};
  if (!newJobs) {
    res.status(400).json({ error: "must specify required jobs" });
    return;
  }

  for (let job in newJobs) {
    if (typeof job !== "string" || !JOB_ENUM.includes(job.toUpperCase())) {
      res.status(400).json({ error: "invalid job type" });
      return;
    } else if (typeof newJobs[job] !== "number" || newJobs[job] < 0) {
      res.status(400).json({ error: "invalid number of jobs" });
      return;
    }
  }

  const eventId = dbServices.createEvent(db, req.params.teamId, eventName, dateTime, newJobs);
  const newEvent = {
    id: eventId,
    name: eventName,
    dateTime: dateTime,
    jobs: newJobs
  }
  res.status(202).json(newEvent);
});

app.delete('/teams/:teamId/events/:eventId', (req, res) => {
  const adminUser = fetchUserByAuth();
  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (!team) {
    res.status(404).json({ error: "team not found" });
    return;
  }

  const deletedRows = dbServices.removeEvent(db, req.params.teamId, req.params.eventId);
  if (deletedRows === 0) {
    console.warn("event does not exist");
  }
  res.status(200).json({ message:"event deleted" });
});

// access as admin
app.get('/teams/:teamId/events', (req, res) => {
  const adminUser = fetchUserByAuth();
  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (!team) {
    res.status(404).json({ error: "team not found" });
    return;
  }
  const events = dbServices.getEventsByTeamId(db, req.params.teamId);
  // TODO: enrich with more info
  res.status(200).json(events);
});

// access as subscriber
app.get('/events', (req, res) => {
  const user = fetchUserByAuth();
  const events = dbServices.getEventsBySubscriberId(db, user.id);
  res.status(200).json(events);
});

// access as admin
app.get('/teams/:teamId/events/:eventId', (req, res) => {
  const adminUser = fetchUserByAuth();
  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (!team) {
    res.status(404).json({ error: "team not found" });
    return;
  }
  const event = dbServices.getEventById(db, req.params.eventId);
  if (!event) {
    res.status(404).json({ error: "event not found" });
    return;
  }
  const volunteers = dbServices.getUserXEventsByEventId(db, req.params.eventId);
  const jobs = dbServices.getJobsByEventId(db, req.params.eventId);

  res.status(200).json({e:event, v:volunteers, j:jobs});
});

// access as user
app.get('/events/:eventId', (req, res) => {
  const event = dbServices.getEventById(db, req.params.eventId);
  res.status(200).json(event);
});


app.post('/events/:eventId/volunteers', (req, res) => {
  const user = fetchUserByAuth();

  try {
    dbServices.createUserXEvent(db, user.id, req.params.eventId);
    res.status(202).json({ message:"volunteer added to event" });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      res.status(202).json({ message: "volunteer added to event" });
      console.warn("volunteer already assigned to event");
    } else {
      res.status(500).json({ error:err });
    }
  }
});

app.delete('/events/:eventId/volunteers', (req, res) => {
  const user = fetchUserByAuth();

  const deletedRows = dbServices.removeUserXEvent(db, user.id, req.params.eventId);
  if (deletedRows === 0) {
    console.warn("DELETE:/events/:eventId/volunteers - user not volunteering to event");
  }
  res.status(200).json({ message:"volunteer withdrawn from event" });
});

app.post('/teams/:teamId/events/:eventId/jobs', (req, res) => {
  const adminUser = fetchUserByAuth();
  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (!team) {
    res.status(404).json({ error: "team not found" });
    return;
  }
  // TODO: validate jobsType

  try {
    dbServices.createJob(db, req.params.eventId, req.body.jobType);
    res.status(202).json({ message:"job added" });
  } catch (err) {
    console.error("POST:/teams/:teamId/events/:eventId/jobs", err);
    res.status(500).json({ error:err });
  }
});

app.delete('/teams/:teamId/events/:eventId/jobs/:jobId', (req, res) => {
  const adminUser = fetchUserByAuth();
  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (!team) {
    res.status(404).json({ error: "team not found" });
    return;
  }
  const event = dbServices.getEventByIdAndTeamId(db, req.params.eventId, req.params.teamId);
  if (!event) {
    res.status(404).json({ error: "event not found" });
  }

  const deletedRows = dbServices.removeJob(db, req.params.jobId, req.params.eventId);
  if (deletedRows === 0) {
    console.warn("DELETE:/teams/:teamId/events/:eventId/jobs/:jobId - job not assigned to eventId");
  }
  res.status(200).json({ message: "job removed" });
});

// assign/unassign user to job
app.patch('/teams/:teamId/events/:eventId/jobs/:jobId', (req, res) => {
  const adminUser = fetchUserByAuth();
  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (!team) {
    res.status(404).json({ error: "team not found" });
    return;
  }
  const event = dbServices.getEventByIdAndTeamId(db, req.params.eventId, req.params.teamId);
  if (!event) {
    res.status(404).json({ error: "event not found" });
  }

  const changedRows = dbServices.updateJobHelper(db, req.params.jobId, req.params.eventId, req.body.userId);
  if (changedRows === 0) {
    console.warn("PUT:/teams/:teamId/events/:eventId/jobs/:jobId - no changes performed");
  }
  res.status(200).json({ message: "helper un-/assigned" });
});



// TODO:close db connection on shut down. THIS EVEN WORKS?
process.on('SIGTERM', () => {
  debug('SIGTERM signal received: closing HTTP server');
  db.close(() => {
    console.log("db close");
  });
  server.close(() => {
    debug('HTTP server closed');
  });
});

/* ### TEST CODE ### */
app.get('/', (req, res) => {
  res.send(req);
});

app.get('/test', (req, res) => {
  res.send(res);
});

app.post('/test', (req, res) => {
  if (checkAccessToken(req.headers["authorization"])) {
    res.status(200).send("Works!");
  } else 
    res.status(403).send('Error!');
})

app.post('/test/somedata', (req, res) => {
  console.log(req.body)
  res.send('Got POST request with following content for "username": ' + req.body.username);
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
// INFO to start type in cmd: node app.js
'use strict';

import express from "express";
import sqlite from "better-sqlite3";
import bodyParser from "body-parser";

import dbServices from "./db-service.js";

const app = express();
const db = new sqlite('../sqlite-db/halp.db', { fileMustExist: true });
db.pragma('journal_mode = WAL');

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

app.use(bodyParser.json());

const port = 3000;

const JOB_ENUM = [
  "SCORER",
  "BALLER",
  "CLEANER",
  "OFFICIAL"
];

const fetchUserByAuth = () => {
  return dbServices.getUserByEmail(db, "t@gmx.net");
};

app.post('/auth/signup', (req, res) => {
  const displayName = req.body.displayName ? req.body.displayName.trim() : "";
  const email = req.body.email ? req.body.email.trim() : "";
  let password = req.body.password ? req.body.password : "";

  try {
    const userId = dbServices.createUser(db, displayName, email, password);
    res.status(202).json({ msg: "User successfully created" });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_CHECK") {
      res.status(400).json({ error: "name, email, and password cannot be empty" });
    } 
    else if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      const duplicateValue = "unknown value";
      if (err.message.includes("name"))
        duplicateValues = "name";
      if (err.message.includes("email"))
        duplicateValues = "email";
      res.status(400).json({ error: duplicateValue + " already exists" });
    } else
      res.status(500).json({ error: err });
  }  
});

app.post('/auth/login', (req, res) => {
  let email = req.body.email ? req.body.email.trim() : "";
  let password = req.body.password;

  const user = dbServices.getUserByEmail(db, email);

  if  (!user || user.password !== password) {
    res.status(200).json({ msg: "authentication failed"});
  } else 
    res.status(200).json({ msg: "authentication success"})
});

// TODO:fix and test in Postman
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

app.post('/teams', (req, res) => {
  const adminUser = fetchUserByAuth();

  const teamName = req.body.teamName ? req.body.teamName.trim() : "";
  const teamNameExists = dbServices.existsTeamWithName(db, teamName, adminUser.id);
  if (teamNameExists) {
    res.status(400).json({ error: "team name already in use" });
    return;
  }

  const newTeamId = dbServices.createTeam(db, teamName, adminUser.id);

  let newTeam = {
    id: newTeamId,
    name: teamName,
    adminId: adminUser.id,
    subscriberIds: [],
    eventIds: {}
  };

  res.status(202).json(newTeam);
});

app.delete('/teams/:teamId', (req, res) => {
  const adminUser = fetchUserByAuth();

  const deletedRows = dbServices.removeTeam(db, req.params.teamId, adminUser.id);
  if (deletedRows === 0) {
    console.warn("team does not exist");
  }
  res.status(200).json({ message:"team deleted" });
});

app.get('/teams', (req, res) => {
  const adminUser = fetchUserByAuth();

  const teams = dbServices.getTeams(db, adminUser.id);
  res.status(200).json(teams);
});

app.get('/teams/:teamId', (req, res) => {
  const adminUser = fetchUserByAuth();

  const team = dbServices.getTeamById(db, req.params.teamId, adminUser.id);
  if (team) {
    res.status(200).json(team);
  } else
    res.status(404).json({ error: "team not found" });
});

// subscribe current user to team
app.post('/teams/:teamId/subscribers', (req, res) => {
  const user = fetchUserByAuth();

  try {
    dbServices.createUserXTeam(db, user.id, req.params.teamId);
    res.status(200).json({ message: "subscribed to team" });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      res.status(200).json({ message: "subscribed to team" });
      console.warn("user already subscribed to team");
    } else {
      res.status(500).json({ error: err });
    }
  }
});

// unsubscribe current user from team
app.delete('/teams/:teamId/subscribers', (req, res) => {
  const user = fetchUserByAuth();

  const deletedRows = dbServices.removeUserXTeam(db, user.id, req.params.teamId);
  if (deletedRows === 0) {
    console.warn("user not subscribed to team");
  }
  res.status(200).json({ message: "unsubscribed from team" })
})


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
  res.send('Hello World!')
})

app.get('/test', (req, res) => {
  db.all('SELECT * FROM lorem', (err, row) => {
    console.log(`${row}`);
    res.send(row);
  })
})

app.post('/test', (req, res) => {
  res.send('Got POST request');
})

app.post('/test/somedata', (req, res) => {
  console.log(req.body)
  res.send('Got POST request with following content for "username": ' + req.body.username);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

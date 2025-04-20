import express from "express";

import dbService from "../db-service.js";
import eventsRoute from "./events_admin.js";

const router = express.Router();

router.post('/', (req, res) => {
  const teamName = req.body.teamName ? req.body.teamName.trim() : "";
  const teamNameExists = dbService.existsTeamWithName(teamName, req.body.userId);
  if (teamNameExists) {
    res.status(400).json({ error: "team name already in use" });
    return;
  }

  const newTeamId = dbService.createTeam(teamName, req.body.userId);

  let newTeam = {
    id: newTeamId,
    name: teamName,
    adminId: req.body.userId,
    subscriberIds: [],
    eventIds: {}
  };

  res.status(202).json(newTeam);
});

/* --------------------- */
/* ---- user access ---- */
/* --------------------- */

// TODO: pagination, filter, ...
router.get('/', (req, res) => {
  const teams = dbService.getTeams(req.body.userId);
  res.status(200).json(teams);
});

// subscribe current user to team
router.post('/:teamId/subscribers', (req, res) => {
  try {
    dbService.createUserXTeam(req.body.userId, req.params.teamId);
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
router.delete('/:teamId/subscribers', (req, res) => {
  const deletedRows = dbService.removeUserXTeam(req.body.userId, req.params.teamId);
  if (deletedRows === 0) {
    console.warn("user not subscribed to team");
  }
  res.status(200).json({ message: "unsubscribed from team" })
});

/* ---------------------- */
/* ---- admin access ---- */
/* ---------------------- */

const checkIfAdmin = (req, res, next) => {
  const adminId = dbService.getTeamAdminId(req.params.teamId);
  
  if (adminId === -1) {
    res.status(404).send("team does not exist");
    return;
  }
  
  if (req.body.userId === adminId) {
    next();
    return;
  }
  
  console.warn("trying to delete team without proper authorization");
  res.status(403).send("no permissions for this action");
};

// TODO: check efficiency of double getTeamById call
router.use("/:teamId", checkIfAdmin);

router.delete('/:teamId', (req, res) => {
  const deletedRows = dbService.removeTeam(req.params.teamId);
  if (deletedRows === 0) {
    console.error("cannot delete team because not exists; should not enter this code");
  }
  res.status(200).send("team deleted");
});

router.get('/:teamId', (req, res) => {
  const team = dbService.getTeamById(req.params.teamId);
  const subscribers = dbService.getUserXTeamByTeamId(req.params.teamId);
  team.subscribers = subscribers;
  res.status(200).json(team);
});

router.use('/:teamId/events', eventsRoute);

export default router;
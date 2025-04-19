import express from "express";

import dbService from "../db-service.js";

const router = express.Router({ mergeParams: true });

export default router;

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

router.delete('/:teamId', (req, res) => {

  const deletedRows = dbService.removeTeam(req.params.teamId, req.body.userId);
  if (deletedRows === 0) {
    console.warn("team does not exist");
  }
  res.status(200).json({ message:"team deleted" });
});

// TODO: pagination, filter, ...
router.get('/', (req, res) => {
  const teams = dbService.getTeams(req.body.userId);
  res.status(200).json(teams);
});

const setAdmin = (req, res, next) => {
  const adminId = dbService.getTeamAdminId(req.params.teamId);
  if (req.body.userId === adminId) {
    req.body.isAdmin = true;
  } else {
    req.body.isAdmin = false;
  }
  next();
};

// TODO: check efficiency of double getTeamById call
router.use("/:teamId", setAdmin);

router.get('/:teamId', (req, res) => {
  const team = dbService.getTeamById(req.params.teamId);
  if (team) {
    if (req.body.isAdmin) {
      const subscribers = dbService.getUserXTeamByTeamId(req.params.teamId);
      team.subscribers = subscribers;
    }
    res.status(200).json(team);
  } else {
    res.status(404).send( "team not found" );
  }
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
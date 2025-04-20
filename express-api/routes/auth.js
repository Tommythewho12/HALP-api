import express from "express";
import jwt from "jsonwebtoken";

import dbService from "../db-service.js";
import teamsRoute from "./teams.js";
import eventsRoute from "./events.js";

const ACCESS_TOKEN_SECRET = 'this-is-my-super-secret-secret-that-noone-will-ever-find-out'; // TODO: place in secret file or so?
const REFRESH_TOKEN_SECRET = 'this-is-my-not-so-super-secret-secret-that-noone-will-ever-find-out';


const router = express.Router();

router.use('/', (req, res, next) => {
  let errorMessage = "";
  // check access token
  const authorizationHeader = req.headers["authorization"];
  if (authorizationHeader) {
    const accessToken = authorizationHeader.split(" ")[1];
    const id = jwt.verify(accessToken, ACCESS_TOKEN_SECRET).id;
    if (id) {
      req.body.userId = id;
      next();
      return; // TODO: check if cleaner way exists
    } else {
      console.info("Access denied: invalid access token");
      errorMessage = "your session has expired. you must log in again";
    }
  } else {
    console.info("Access denied: missing access token");
    errorMessage = "you must first log in in order to access this resource"
  }
  res.status(403).send(errorMessage);
});

router.use('/teams', teamsRoute);
router.use('/events', eventsRoute);

export default router;
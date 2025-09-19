import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"; // TODO: check alternatives; npm marks deprecated

const SALT = process.env.SALT | 10;

import dbService from "../db-service.js";

import teamsRoute from "./teams.js";
import eventsRoute from "./events.js";

const ACCESS_TOKEN_SECRET = 'this-is-my-super-secret-secret-that-noone-will-ever-find-out'; // TODO: place in secret file or so?

const router = express.Router();

router.use('/', (req, res, next) => {
    let errorMessage = "";
    // check access token
    const authorizationHeader = req.headers["authorization"];
    if (req.cookies.refreshToken && authorizationHeader && authorizationHeader.split(" ")[1]) {
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
        console.info("Access denied: missing refresh and/or access token");
        errorMessage = "you must first log in in order to access this resource"
    }
    res.status(403).send(errorMessage);
});

router.patch("/change-password", (req, res) => {
    const oldPassword = req.body.oldPassword || "";
    const newPassword = req.body.newPassword || "";

    const oldPasswordHash = dbService.getUserPasswordHashById(req.body.userId);
    if (oldPassword === "" || newPassword === "") {
        console.warn("updating password failed: missing value for old or new password");
        return res.status(400).send("password cannot be empty");
    } else if (!bcrypt.compareSync(oldPassword, oldPasswordHash)) {
        console.warn("updating password failed: old password was wrong");
        return res.status(401).send("invalid credentials");
    } else if (bcrypt.compareSync(newPassword, oldPasswordHash)) {
        console.warn("updating password failed: new password equal to old password");
        return res.status(400).send("you must select a new password");
    }
    // TODO: add password requirements, also in /signup

    const changes = dbService.updateUserPassword(req.body.userId, bcrypt.hashSync(newPassword, SALT));
    if (changes != 1) {
        console.warn("updating password failed");
        return res.status(500).send("something went wrong while changing password");
    }
    // TODO: send email to inform about change-password
    return res.status(200).send("password changed");
});

router.get("/secureTest", (_, res) => {
    return res.status(200).send("send nudes!");
});

router.use('/teams', teamsRoute);
router.use('/events', eventsRoute);

export default router;
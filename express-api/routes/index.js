import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"; // TODO: check alternatives; npm marks deprecated

import dbService from "../db-service.js";
import emailService from "../email-service.js";

const SALT = process.env.SALT | 10;
const ACCESS_TOKEN_SECRET = 'this-is-my-super-secret-secret-that-noone-will-ever-find-out';
const REFRESH_TOKEN_SECRET = 'this-is-my-not-so-super-secret-secret-that-noone-will-ever-find-out';

const createAccessToken = (id) => {
    return jwt.sign({ id }, ACCESS_TOKEN_SECRET, {
        expiresIn: 5 * 60,
    });
};

const createRefreshToken = (id) => {
    const refreshToken = jwt.sign({ id }, REFRESH_TOKEN_SECRET, {
        expiresIn: "90d",
    });
    dbService.updateUserRefreshToken(id, refreshToken);
    return refreshToken;
};

const generateRandomPassword = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
};


const router = express.Router({ mergeParams: true });

router.post('/signup', (req, res) => {
    const displayName = req.body.displayName ? req.body.displayName.trim() : "";
    const email = req.body.email ? req.body.email.trim() : "";
    const password = req.body.password ? req.body.password : "";

    if (displayName === "" || email === "" || password === "") {
        console.info("Sign up failed: undefinded or empty displayName [" + displayName + "], email [" + email + "], and/or password [" + password + "]");
        res.status(400).send("name, email, and password cannot be blank");
        return;
    }
    // TODO: add password requirements also in /auth/change-password

    const passwordHash = bcrypt.hashSync(password, SALT);
    try {
        const userId = dbService.createUser(displayName, email, passwordHash);
        res.status(202).send("User successfully created");
        console.info("User created: displayName [" + displayName + "], email [" + email + "]");
    } catch (err) {
        if (err.code === "SQLITE_CONSTRAINT_CHECK") {
            res.status(400).send("name, email, and password cannot be blank");
        }
        else if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
            let duplicateValue = "unknown value";
            if (err.message.includes("name")) {
                duplicateValue = "name";
                console.warn("User creation failed: displayName [" + displayName + "] already in use");
            }
            if (err.message.includes("email")) {
                duplicateValue = "email";
                console.warn("User creation failed: email [" + email + "] already in use");
            }
            res.status(400).send(duplicateValue + " already in use. Please use different value");
        } else {
            // TODO: insert default err message
            res.status(500).send("something went wrong");
            console.error(err);
        }
    }
});

router.post('/login', (req, res) => {
    const email = req.body.email ? req.body.email.trim() : "";
    const password = req.body.password;

    if (email === "" || password === undefined) {
        console.info("Login failed: undefinded or empty email [" + email + "], and/or password [" + password + "]");
        res.status(400).send("email, and password cannot be blank");
        return;
    }

    const user = dbService.getUserByEmail(email);

    if (user && bcrypt.compareSync(password, user.password)) {
        const accessToken = createAccessToken(user.id);
        const refreshToken = createRefreshToken(user.id);

        res
            .status(200)
            .cookie("refreshToken", refreshToken)
            .json({
                accessToken: accessToken,
                msg: "authentication success"
            });
        return;
    } else {
        res.status(401).send("invalid credentials");
        return;
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie("refreshToken");
    dbService.clearUserRefreshToken(req.body.email);
    return res.status(200).send("logged out successfully");
});

// TODO change to GET request
router.post("/refresh-token", (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            console.warn("trying to refresh acces token without refresh token");
            return res.status(400).send("missing refresh token");
        }

        let userId;
        try {
            userId = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET).id;
        } catch (err) {
            console.warn("trying to refresh acces token with invalid refresh token");
            return res.status(400).send("invalid refresh token");
        }

        if (!userId) {
            console.warn("trying to refresh acces token with invalid refresh token");
            return res.status(400).send("invalid refresh token");
        }

        let storedRefreshToken;
        try {
            storedRefreshToken = dbService.getUserRefreshTokenByUserId(userId);
        } catch (err) {
            console.error("error while trying to refresh access token", err);
            return res.status(500).send("something went wrong");
        }

        if (storedRefreshToken !== refreshToken) {
            console.info("provided refresh token does not match stored refresh token");
            return res.status(400).send("invalid refresh token");
        }

        const newAccessToken = createAccessToken(userId);
        return res
            .status(200)
            .json({
                accessToken: newAccessToken,
                msg: "re-authentication success"
            });
    } catch (err) {
        console.info("error trying to refresh acces token", err);
        return res.status(500).send("something went wrong");
    }
});

// TODO: only update password after email confirmation
router.post("/reset-password", (req, res) => {
    res.clearCookie("refreshToken");

    const email = req.body.email ? req.body.email.trim() : "";
    const randomPassword = generateRandomPassword(8);
    const hashedPassword = bcrypt.hashSync(randomPassword, SALT);

    const changes = dbService.resetUserPassword(email, hashedPassword);
    if (changes == 0) {
        console.info("password was not reset; email does not exist");
    } else {
        dbService.clearUserRefreshToken(req.body.email);
        try {
            emailService.sendMailPasswordReset(email, randomPassword);
        } catch (err) {
            console.log("error sending reset-email", err);
            return;
        }
    }
    return res.status(200).send("a new password was sent to your email");
});

router.get("/test", (req, res) => {
    return res.status(200).send("send feet pics!");
});

export default router;
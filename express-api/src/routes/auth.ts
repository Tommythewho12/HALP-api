import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'; // TODO: check alternatives; npm marks deprecated

const SALT = Number(process.env.SALT) | 10;

import Repository from '../repositories/Repository.js';

import usersRoute from './users.js';
import teamsRoute from './teams.js';
import eventsRoute from './events.js';

const ACCESS_TOKEN_SECRET = 'this-is-my-super-secret-secret-that-noone-will-ever-find-out'; // TODO: place in secret file or so?

const router = express.Router();

router.use('/', (req, res, next) => {
    let errorMessage = '';
    // check access token
    const authorizationHeader = req.headers['authorization'];

    if (authorizationHeader && authorizationHeader.split(' ')[1]) {
        const accessToken = authorizationHeader.split(' ')[1];
        try {
            if (typeof accessToken === 'string') {
                const verified = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as { id: string };
                if (verified && verified.id) {
                    req.body.userId = verified.id;
                    next();
                    return; // TODO: check if cleaner way exists
                } else {
                    console.info('Access denied: invalid access token');
                    errorMessage = 'your session has expired. you must log in again';
                }
            } else {
                console.error('access token is not of type string');
            }
        } catch (error) {
            console.error('problem verifying jwt token ', error);
        }
    } else {
        console.info('Access denied: missing access token');
        errorMessage = 'you must first log in in order to access this resource'
    }
    res.status(401).send(errorMessage);
});

router.patch('/change-password', async (req, res) => {
    const oldPassword = req.body.oldPassword || '';
    const newPassword = req.body.newPassword || '';

    const oldPasswordHash = await Repository.getPassword(req.body.userId);
    if (!oldPassword || !newPassword || typeof oldPasswordHash !== 'string') {
        console.warn('updating password failed: missing value for old or new password');
        return res.status(400).send('password cannot be empty');
    } else if (!bcrypt.compareSync(oldPassword, oldPasswordHash)) {
        console.warn('updating password failed: old password was wrong');
        return res.status(401).send('invalid credentials');
    } else if (bcrypt.compareSync(newPassword, oldPasswordHash)) {
        console.warn('updating password failed: new password equal to old password');
        return res.status(400).send('you must select a new password');
    }

    // TODO: add password requirements, also in /signup
    await Repository.updatePasswordByUserId(req.body.userId, bcrypt.hashSync(newPassword, SALT));

    // TODO: send email to inform about change-password
    return res.status(200).send('password changed');
});

router.get('/secureTest', (_, res) => {
    return res.status(200).send('send nudes!');
});

router.use('/user', usersRoute);
router.use('/teams', teamsRoute);
router.use('/events', eventsRoute);

export default router;
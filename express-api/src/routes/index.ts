import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'; // TODO: check alternatives; npm marks deprecated
import { SqliteError } from 'better-sqlite3';

import { repository } from '../repositories/repository.js';
import emailService from '../services/email-service.js';
import { decode } from 'node:punycode';
import type User from '../domain/models/User.js';
import { errorJson, successJson } from './api-utils.js';

// TODO move to env/config file
const SALT = Number(process.env.SALT) || 10;
const ACCESS_TOKEN_SECRET = 'this-is-my-super-secret-secret-that-noone-will-ever-find-out';
const REFRESH_TOKEN_SECRET = 'this-is-my-not-so-super-secret-secret-that-noone-will-ever-find-out';

const createAccessToken = (userId: string) => {
    return jwt.sign({ id: userId }, ACCESS_TOKEN_SECRET, {
        expiresIn: 5 * 60,
    });
};

const createRefreshToken = async (userId: string) => {
    // TODO add tokenVersion to jwt for improved security (e.g. password changes)
    const refreshToken = jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, {
        expiresIn: '90d',
    });
    const hashedToken = bcrypt.hashSync(refreshToken, SALT);
    await repository.updateRefreshToken(userId, hashedToken);
    return refreshToken;
};

const generateRandomPassword = (length: number) => {
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

router.post('/signup', async (req, res) => {
    // TODO set random password first and force user to change on first login
    // TODO research why const displayName = req.body.displayName?.trim() ?? null; does not evaluate to null if ''
    const displayName = req.body.displayName ? req.body.displayName.trim() : null;
    const email = req.body.email ? req.body.email.trim() : null;
    const password = req.body.password ?? null;
    // TODO: add password requirements also in /auth/change-password

    const passwordHash = bcrypt.hashSync(password, SALT);
    try {
        const newUser: User = {
            id: null,
            displayName: displayName,
            email: email
        }
        await repository.createUser(newUser, passwordHash);
        console.info('User created: displayName [' + displayName + '], email [' + email + ']');
        return res.status(202).send(successJson('User successfully created'));
    } catch (err) {
        // example for sqlite error handling
        if (err instanceof SqliteError) {
            // TODO extrapolate for other cases as well
            let invalidValue = 'unknown value';
            let value = '';
            if (err.message.includes('name')) {
                invalidValue = 'name';
                value = displayName;
            } else if (err.message.includes('email')) {
                invalidValue = 'email';
                value = email;
            } else if (err.message.includes('password')) {
                invalidValue = 'password';
            }
            switch (err.code) {
                case 'SQLITE_CONSTRAINT_CHECK':
                case 'SQLITE_CONSTRAINT_NOTNULL':
                    console.warn(`User creation failed: '` + invalidValue + `' is blank\n`, err);
                    return res.status(400).send(errorJson('name, email, and password cannot be blank'));
                case 'SQLITE_CONSTRAINT_UNIQUE':
                    console.warn(`User creation failed: '` + invalidValue + `' [` + value + `] already in use\n`, err);
                    return res.status(400).send(errorJson(invalidValue + ' already in use. Please use different value'));
                default:
                    console.error('database error while creating user', err);
            }
        }
        console.error('unknown error while accessing database', err);
        return res.status(500).send(errorJson('server error'));
    }
});

router.post('/login', async (req, res) => {
    const email = req.body.email ? req.body.email.trim() : '';
    const password = req.body.password;

    if (email === '' || password === undefined) {
        console.info('Login failed: undefinded or empty email [' + email + '], and/or password [' + password + ']');
        return res.status(400).send(errorJson('email and password cannot be blank'));
    }

    // TODO user .then().catch() syntax
    const user = await repository.getUserByEmail(email);
    if (!user || !user.id) {
        // TODO throw (generic) Error and catch with middleware
        throw new Error('todo');
    }
    const hashedPassword = await repository.getPassword(user.id);
    if (!hashedPassword) {
        throw new Error('todo');
    }

    if (bcrypt.compareSync(password, hashedPassword)) {
        const accessToken = createAccessToken(String(user.id));
        const refreshToken = createRefreshToken(String(user.id));

        return res
            .status(200)
            .cookie('refreshToken', refreshToken)
            .json({
                accessToken: accessToken,
                message: 'authentication success'
            });
    } else {
        return res.status(401).send(errorJson('invalid credentials'));
    }
});

router.post('/logout', async (req, res) => {
    res.clearCookie('refreshToken');
    const user = await repository.getUserByEmail(req.body.email);
    if (!user) {
        // TODO
        throw new Error('todo');
    }
    // TODO try catch
    await repository.deleteRefreshToken(req.body.email);
    return res.status(200).send('logged out successfully');
});

// TODO change to GET request
router.post('/refresh-token', async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            console.warn('trying to refresh acces token without refresh token');
            return res.status(400).send('missing refresh token');
        }

        let userId;
        try {
            // TODO create a method for this since it is used multiple times
            const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) as { id: string };
            if (decode === null) {
                console.error('');
                return res.status(500).send({ 'errorMessage': 'something went wrong' });
            }
            userId = decoded.id;
        } catch (err) {
            console.warn('trying to refresh acces token with invalid refresh token');
            // TODO return JSON always
            return res.status(400).send('invalid refresh token');
        }

        if (!userId) {
            console.warn('trying to refresh acces token with invalid refresh token');
            return res.status(400).send('invalid refresh token');
        }

        let storedRefreshToken;
        try {
            storedRefreshToken = await repository.getRefreshToken(userId);
        } catch (err) {
            console.error('error while trying to refresh access token', err);
            return res.status(500).send('something went wrong');
        }

        if (!storedRefreshToken || !bcrypt.compareSync(refreshToken, storedRefreshToken)) {
            console.info('provided refresh token does not match stored refresh token');
            return res.status(400).send('invalid refresh token');
        }

        const newAccessToken = createAccessToken(userId);
        const newRefreshToken = createRefreshToken(userId);
        return res
            .status(200)
            .cookie('refreshToken', newRefreshToken)
            .json({
                accessToken: newAccessToken,
                msg: 're-authentication success'
            });
    } catch (err) {
        console.info('error trying to refresh acces token', err);
        return res.status(500).send('something went wrong');
    }
});

// TODO: only update password after email confirmation
router.post('/reset-password', async (req, res) => {
    res.clearCookie('refreshToken');

    const email = req.body.email ? req.body.email.trim() : '';
    const randomPassword = generateRandomPassword(8);
    const hashedPassword = bcrypt.hashSync(randomPassword, SALT);

    const user = await repository.getUserByEmail(email);
    if (user) {
        console.info('password was not reset; email does not exist');
    } else {
        await repository.updatePasswordByUserEmail(req.body.email, hashedPassword);
        try {
            emailService.sendMailPasswordReset(email, randomPassword);
        } catch (err) {
            console.log('error sending reset-email', err);
            return;
        }
    }
    return res.status(200).send(successJson('a new password was sent to your email'));
});

router.get('/test', (req, res) => {
    return res.status(200).send('send feet pics!');
});

export default router;
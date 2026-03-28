'use strict';

import express from "express";
import cookieParser from "cookie-parser";
import 'dotenv/config';

import router from "./routes/index.js";
import authRoute from "./routes/auth.js";

const PORT = Number(process.env.PORT) || 3000;

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    console.debug(`Incoming Request: ${req.method} ${req.originalUrl}`);
    console.debug(`Incoming Body: `, req.body);
    console.debug(`Incoming auth header`, req.headers["authorization"])

    const originalSend = res.send;
    res.send = function (body) {
        console.debug(`Outgoing Response: ${res.statusCode}`);
        console.debug(`Response Body: ${body}`);
        return originalSend.call(this, body);
    };

    next();
});

app.use('/', router);
app.use('/auth', authRoute);

const server = app.listen(PORT, () => {
    console.log(`halp-api listening on port ${PORT}`)
});

process.on('SIGTERM', () => {
    console.debug('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.debug('HTTP server closed');
    });
});

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
process.on('exit', (code) => {
    console.info("shutting down halp-api at ", new Date());
    console.info("halp-api shut down with code: ", code);
});
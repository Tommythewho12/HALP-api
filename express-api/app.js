// INFO to start type in cmd: node app.js
'use strict';

import express from "express";
import cookieParser from "cookie-parser";

import indexRoute from "./routes/index.js";
import authRoute from "./routes/auth.js";

// TODO: outsource into .env file; remember to ignore .env in gitignore
const PORT = process.env.HALP_API_PORT | 3000;
// const NODE_ENV = 'production'; // TODO: set for prod

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.debug(`Incoming Request: ${req.method} ${req.originalUrl}`);

  const originalSend = res.send;
  res.send = function (body) {
    console.debug(`Outgoing Response: ${res.statusCode}`);
    console.debug(`Response Body: ${body}`);
    return originalSend.call(this, body);
  };

  next();
});

app.use('/', indexRoute);
app.use('/auth', authRoute);

const server = app.listen(PORT, () => {
  console.log(`halp-api listening on port ${PORT}`)
});

process.on('SIGTERM', () => {
  debug('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    debug('HTTP server closed');
  });
});

process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));
process.on('exit', (code) => {
  console.info("shutting down halp-api at ", new Date());
  console.info("halp-api shut down with code: ", code);
});
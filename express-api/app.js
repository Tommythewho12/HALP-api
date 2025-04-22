// INFO to start type in cmd: node app.js
'use strict';

import express from "express";
import sqlite from "better-sqlite3";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

import indexRoute from "./routes/index.js";
import authRoute from "./routes/auth.js";
import dbServices from "./db-service.js";

// TODO: outsource into .env file; remember to ignore .env in gitignore
const PORT = process.env.HALP_API_PORT | 3000;
// const NODE_ENV = 'production'; // TODO: set for prod

const app = express();

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

app.use(express.json());
app.use(cookieParser());

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
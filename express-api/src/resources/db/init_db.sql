DROP TABLE IF EXISTS job;
DROP TABLE IF EXISTS userXevent;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS userXteam;
DROP TABLE IF EXISTS team;
DROP TABLE IF EXISTS auth;
DROP TABLE IF EXISTS user;

CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    CHECK(display_name <> '' AND email <> '')
);

CREATE TABLE IF NOT EXISTS auth (
    id INTEGER PRIMARY KEY NOT NULL,
    password TEXT NOT NULL,
    refresh_token TEXT,
    CHECK(password <> ''),
    FOREIGN KEY (id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    name TEXT NOT NULL UNIQUE,
    FOREIGN KEY (admin_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT
);

-- aka subscription
CREATE TABLE IF NOT EXISTS userXteam (
    team_id INTEGER NOT NULL,
    subscriber_id INTEGER NOT NULL,
    PRIMARY KEY(team_id, subscriber_id),
    FOREIGN KEY(team_id)
        REFERENCES team(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    FOREIGN KEY(subscriber_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event (
    id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_datetime INTEGER NOT NULL,
    complete INTEGER DEFAULT 0,
    FOREIGN KEY (team_id)
        REFERENCES team(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
);

-- aka volunteering
CREATE TABLE IF NOT EXISTS userXevent (
    event_id INTEGER NOT NULL,
    volunteer_id INTEGER NOT NULL,
    PRIMARY KEY(event_id, volunteer_id),
    FOREIGN KEY(event_id)
        REFERENCES event(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    FOREIGN KEY(volunteer_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
);

-- aka assignment
CREATE TABLE IF NOT EXISTS job (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    assignee_id INTEGER,
    UNIQUE(event_id, assignee_id),
    FOREIGN KEY(event_id)
        REFERENCES event(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    FOREIGN KEY(assignee_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
    -- CHECK(type in (
        -- 'BALLER',
        -- 'CLEANER',
        -- 'SCORER',
        -- 'OFFICIAL'
    -- ))
);

-- ensures that foreign keys are enfored
PRAGMA foreign_keys = ON;
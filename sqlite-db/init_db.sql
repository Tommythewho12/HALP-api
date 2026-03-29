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
    name TEXT NOT NULL UNIQUE,
    admin_id INTEGER NOT NULL,
    FOREIGN KEY (admin_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE SET DEFAULT
);

-- aka subscription
CREATE TABLE IF NOT EXISTS userXteam (
    user_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    PRIMARY KEY(user_id, team_id),
    FOREIGN KEY(user_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    FOREIGN KEY(team_id)
        REFERENCES team(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_datetime INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    complete INTEGER DEFAULT 0,
    FOREIGN KEY (team_id)
        REFERENCES team(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
);

-- aka volunteering
CREATE TABLE IF NOT EXISTS userXevent (
    user_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    PRIMARY KEY(user_id, event_id),
    FOREIGN KEY(user_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    FOREIGN KEY(event_id)
        REFERENCES event(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE
);

-- aka assignment
CREATE TABLE IF NOT EXISTS job (
    id INTEGER PRIMARY KEY,
    event_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    user_id INTEGER,
    UNIQUE(event_id, user_id),
    FOREIGN KEY(event_id)
        REFERENCES event(id)
            ON UPDATE CASCADE
            ON DELETE CASCADE,
    FOREIGN KEY(user_id)
        REFERENCES user(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL,
    CHECK(type in (
        -- 'BALLER',
        -- 'CLEANER',
        'SCORER',
        'OFFICIAL'
    ))
);

-- ensures that foreign keys are enfored
PRAGMA foreign_keys = ON;
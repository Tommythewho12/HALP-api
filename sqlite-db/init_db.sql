DROP TABLE IF EXISTS userXevent;
DROP TABLE IF EXISTS event;
DROP TABLE IF EXISTS userXteam;
DROP TABLE IF EXISTS team;
DROP TABLE IF EXISTS user;

CREATE TABLE IF NOT EXISTS user (
	id INTEGER PRIMARY KEY,
	display_name TEXT NOT NULL UNIQUE,
	email TEXT NOT NULL UNIQUE,
	password TEXT NOT NULL,
	CHECK(display_name <> '' AND email <> '' AND password <> '')
);

CREATE TABLE IF NOT EXISTS team (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	admin_id INTEGER NOT NULL,
	FOREIGN KEY (admin_id)
		REFERENCES user(id)
);

CREATE TABLE IF NOT EXISTS userXteam (
	user_id INTEGER NOT NULL,
	team_id INTEGER NOT NULL,
	PRIMARY KEY(user_id, team_id),
	FOREIGN KEY(user_id) REFERENCES user(id),
	FOREIGN KEY(team_id) REFERENCES team(id)
);

CREATE TABLE IF NOT EXISTS event (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL,
	start_datetime TEXT NOT NULL,
	team_id INTEGER NOT NULL,
	scorers INTEGER DEFAULT 0,
	cleaners INTEGER DEFAULT 0,
	officials INTEGER DEFAULT 0,
	FOREIGN KEY (team_id)
		REFERENCES team(id)
);

CREATE TABLE IF NOT EXISTS userXevent (
	user_id INTEGER NOT NULL,
	event_id INTEGER NOT NULL,
	PRIMARY KEY(user_id, event_id),
	FOREIGN KEY(user_id) REFERENCES user(id),
	FOREIGN KEY(event_id) REFERENCES event(id)
);

-- fill in test data

INSERT INTO user (id, display_name, email, password)
	VALUES (1, 't', 't@gmx.net', 't');

INSERT INTO team (id, name, admin_id)
	VALUES (1, 'New Group', 1);

INSERT INTO event (id, name, start_datetime, team_id, scorers)
	VALUES (1, 'abc123', '2025-05-15T10:00', 1, 2);
const dbServices = {
	createUser: (db, displayName, email, password) => {
		const stmt = db.prepare(`INSERT INTO user (display_name, email, password) VALUES (?, ?, ?)`);
		return stmt.run(displayName, email, password).lastInsertRowid;
	},

	getUsers: (db) => {
		const stmt = db.prepare(`SELECT * FROM user`);
		return stmt.all();
	},

	getUserById: (db, userId) => {
		const stmt = db.prepare(`SELECT * FROM user WHERE id=?`);
		return stmt.get(userId);
	},

	getUserByEmail: (db, email) => {
		const stmt = db.prepare(`SELECT * FROM user WHERE email=?`);
		return stmt.get(email);
	},

	existsUserWithDisplayName: (db, displayName) => {
		const stmt = db.prepare(`SELECT COUNT(*) as 'exists' FROM user WHERE display_name=?`);
		return stmt.get(displayName).exists === 1;
	},

	createTeam: (db, teamName, adminId) => {
		const stmt = db.prepare(`INSERT INTO team (name, admin_id) VALUES (?, ?)`);
		return stmt.run(teamName, adminId).lastInsertRowid;
	},

	removeTeam: (db, teamId, adminId) => {
		const stmt = db.prepare(`DELETE FROM team WHERE id=? AND admin_id=?`);
		return stmt.run(teamId, adminId).changes;
	},

	getTeams: (db, adminId) => {
		const stmt = db.prepare(`SELECT * FROM team WHERE admin_id=?`);
		return stmt.all(adminId);
	},

	getTeamById: (db, teamId, adminId) => {
		const stmt = db.prepare(`SELECT * FROM team WHERE id=? AND admin_id=?`);
		return stmt.get(teamId, adminId);
	},

	existsTeamWithName: (db, teamName, adminId) => {
		const stmt = db.prepare(`SELECT COUNT(*) as 'exists' FROM team WHERE name=? AND admin_id=?`);
		return stmt.get(teamName, adminId).exists === 1;
	},

	createUserXTeam: (db, userId, teamId) => {
		const stmt = db.prepare(`INSERT INTO userXteam VALUES (?, ?)`);
		return stmt.run(userId, teamId);
	},

	removeUserXTeam: (db, userId, teamId) => {
		const stmt = db.prepare(`DELETE FROM userXteam WHERE user_id=? AND team_id=?`);
		return stmt.run(userId, teamId).changes;
	},

	createEvent: (db, teamId, eventName, dateTime, scorers, cleaners, officials) => {
		const stmt = db.prepare(`INSERT INTO event (name, start_datetime, team_id, scorers, cleaners, officials) VALUES (?, ?, ?, ?, ?, ?)`);
		return stmt.run(eventName, dateTime, teamId, scorers, cleaners, officials).lastInsertRowid;
	},

	removeEvent: (db, teamId, eventId) => {
		const stmt = db.prepare(`DELETE FROM event WHERE id=? AND team_id=?`);
		return stmt.run(eventId, teamId).changes;
	},

	getEventById: (db, eventId) => {
		const stmt = db.prepare(`SELECT * FROM event WHERE id=?`);
		return stmt.get(eventId);
	},

	getEventsByTeamId: (db, teamId) => {
		const stmt = db.prepare(`SELECT * FROM event WHERE team_id=?`);
		return stmt.all(teamId);
	},

	getEventsBySubscriberId: (db, userId) => {
		const stmt = db.prepare(`SELECT e.* FROM event e JOIN userXteam uxt ON e.team_id=uxt.team_id WHERE uxt.user_id=?`);
		return stmt.all(userId);
	},

	createUserXEvent: (db, userId, eventId) => {
		const stmt = db.prepare(`INSERT INTO userXevent VALUES (?, ?)`);
		return stmt.run(userId, eventId);
	},

	removeUserXEvent: (db, userId, eventId) => {
		const stmt = db.prepare(`DELETE FROM userXevent WHERE user_id=? AND event_id=?`);
		return stmt.run(userId, eventId).changes;
	}
}

export default dbServices;
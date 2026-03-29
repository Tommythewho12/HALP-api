import express from 'express';

import dbService from '../repositories/better-sqlite/sqlite3Repository';

const router = express.Router();

router.get('/', (req, res) => {
    const userId = req.body.userId;
    let user;
    user = dbService.getUserById(userId);
    res.status(200).json(user);
});

export default router;
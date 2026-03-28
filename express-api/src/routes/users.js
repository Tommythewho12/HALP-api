import express from 'express';

import dbService from '../db-service.js';

const router = express.Router();

router.get('/', (req, res) => {
    const userId = req.body.userId;
    let user;
    user = dbService.getUserById(userId);
    res.status(200).json(user);
});

export default router;
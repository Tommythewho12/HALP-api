import express from 'express';

import { repository } from '../repositories/repository.js';
import { errorJson } from './api-utils.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const userId = req.body.userId;
    if (userId && typeof userId === 'string') {
        const user = await repository.getUserById(userId);
        return res.status(200).json(user);
    }
    return res.status(400).json(errorJson('user not found'));
});

export default router;
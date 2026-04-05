import express from 'express';

import { errorJson, type RequestUserEnriched } from './api-utils.js';
import type { components } from '../../../../api-spec/generated/schema.js';
import { repository } from '../../repositories/repository-factory.js';

const router = express.Router();

router.get<
    '/',
    any,
    components['schemas']['UserSchema'] | components['schemas']['DefaultErrorResponseSchema'],
    RequestUserEnriched,
    any,
    any
>('/', async (req, res) => {
    const userId = req.body.userId;
    if (userId && typeof userId === 'string') {
        const user = await repository.getUserById(userId);
        if (typeof user !== 'undefined')
            return res.status(200).json(user);
    }
    return res.status(400).json(errorJson('user not found'));
});

export default router;
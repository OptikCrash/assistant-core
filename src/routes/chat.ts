import { Router } from 'express';
import { createPlan } from '../planner/taskPlanner';
import { ChatRequest } from '../types/messages';

export const chatRouter = Router();

chatRouter.post('/', async (req, res) => {
    const body: ChatRequest = req.body;

    const result = await createPlan(body);

    res.json(result);
});

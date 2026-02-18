import { Router } from 'express';
import { reviewDiff } from '../features/git/review/reviewService';

export const reviewRouter = Router();

reviewRouter.post('/', async (req, res) => {
    try {
        const result = await reviewDiff(true);
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

import { Router } from 'express';
import { reviewDiff } from '../features/git/review/reviewService';

export const reviewRouter = Router();

reviewRouter.post('/', async (req, res) => {
    try {
        const { workspaceId, staged } = req.body ?? {};

        if (!workspaceId || typeof workspaceId !== 'string') {
            return res.status(400).json({
                error: "workspaceId is required"
            });
        }

        const result = await reviewDiff(
            workspaceId,
            typeof staged === 'boolean' ? staged : true
        );
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

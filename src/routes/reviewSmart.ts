import { Router } from "express";
import { reviewSmartDiff } from "../features/git/review/reviewSmartService";

export const reviewSmartRouter = Router();

reviewSmartRouter.post("/", async (req, res) => {
    try {
        const result = await reviewSmartDiff();
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
